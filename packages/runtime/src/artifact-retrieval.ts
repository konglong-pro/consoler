import { randomUUID } from "node:crypto";

import {
  validateArtifactView,
  type AgentManifest,
  type ArtifactBlockContent,
  type ArtifactView,
  type RenderableBlock
} from "@consoler/protocol";

import {
  ARTIFACT_VIEW_MAX_RESPONSE_BYTES,
  type ArtifactRetrievalAttempt,
  type ArtifactRetrievalErrorCode,
  type FetchArtifactViewResult
} from "./artifact-retrieval-types.js";
import { resultBlocksFromEvents } from "./action-read.js";
import type { ConsolerStore, StoredEvent } from "./db/store.js";
import { getEnabledAgent, loadRegistry } from "./registry.js";
import { JsonRpcAgentClient } from "./transport/jsonrpc.js";
import type { RegistryAgentEntry } from "@consoler/protocol";

function newRetrievalId(): string {
  return `retr_${randomUUID()}`;
}

function uriScheme(uri: string): string | null {
  const index = uri.indexOf("://");
  if (index <= 0) {
    return null;
  }
  return uri.slice(0, index);
}

function storedEventToActionEvent(row: StoredEvent): import("@consoler/protocol").ActionEvent | null {
  try {
    return JSON.parse(row.payload_json) as import("@consoler/protocol").ActionEvent;
  } catch {
    return null;
  }
}

function acceptedEventsForAction(store: ConsolerStore, actionId: string): import("@consoler/protocol").ActionEvent[] {
  const accepted: import("@consoler/protocol").ActionEvent[] = [];
  for (const row of store.listEventsForAction(actionId)) {
    if (row.accepted !== 1) continue;
    const event = storedEventToActionEvent(row);
    if (event) accepted.push(event);
  }
  return accepted;
}

function parseArtifactBlockContent(block: RenderableBlock): ArtifactBlockContent | null {
  if (block.type !== "artifact" || typeof block.content !== "object" || !block.content) {
    return null;
  }
  const content = block.content as Record<string, unknown>;
  if (typeof content.uri !== "string" || typeof content.kind !== "string") {
    return null;
  }
  const parsed: ArtifactBlockContent = {
    uri: content.uri,
    kind: content.kind
  };
  if (typeof content.label === "string") parsed.label = content.label;
  if (typeof content.metadata === "object" && content.metadata) {
    parsed.metadata = content.metadata as Record<string, unknown>;
  }
  return parsed;
}

function capabilitySupports(
  manifest: AgentManifest,
  artifactUri: string,
  kind: string
): { ok: true } | { ok: false; code: ArtifactRetrievalErrorCode; message: string } {
  const capability = manifest.artifact_retrieval;
  if (!capability) {
    return {
      ok: false,
      code: "artifact_retrieval_unsupported",
      message: `Agent ${manifest.agent_id} does not declare artifact_retrieval capability`
    };
  }
  const scheme = uriScheme(artifactUri);
  if (!scheme || !capability.uri_schemes.includes(scheme)) {
    return {
      ok: false,
      code: "artifact_retrieval_unsupported",
      message: `Artifact URI scheme is not supported: ${scheme ?? "missing"}`
    };
  }
  if (!capability.kinds.includes(kind)) {
    return {
      ok: false,
      code: "artifact_retrieval_unsupported",
      message: `Artifact kind is not supported: ${kind}`
    };
  }
  return { ok: true };
}

function toAttempt(row: import("./db/store.js").StoredArtifactRetrieval): ArtifactRetrievalAttempt {
  return {
    retrieval_id: row.retrieval_id,
    action_id: row.action_id,
    agent_id: row.agent_id,
    block_id: row.block_id,
    artifact_uri: row.artifact_uri,
    kind: row.kind,
    status: row.status as ArtifactRetrievalAttempt["status"],
    error_code: row.error_code,
    error_message: row.error_message,
    requested_at: row.requested_at,
    completed_at: row.completed_at
  };
}

function recordAttempt(
  store: ConsolerStore,
  base: {
    action_id: string;
    agent_id: string;
    block_id: string;
    artifact_uri: string;
    kind: string;
    requested_at: string;
  },
  outcome: {
    status: "succeeded" | "failed";
    error_code?: ArtifactRetrievalErrorCode;
    error_message?: string;
  }
): ArtifactRetrievalAttempt {
  const completedAt = new Date().toISOString();
  const attempt: ArtifactRetrievalAttempt = {
    retrieval_id: newRetrievalId(),
    action_id: base.action_id,
    agent_id: base.agent_id,
    block_id: base.block_id,
    artifact_uri: base.artifact_uri,
    kind: base.kind,
    status: outcome.status,
    error_code: outcome.error_code ?? null,
    error_message: outcome.error_message ?? null,
    requested_at: base.requested_at,
    completed_at: completedAt
  };
  store.insertArtifactRetrieval({
    retrieval_id: attempt.retrieval_id,
    action_id: attempt.action_id,
    agent_id: attempt.agent_id,
    block_id: attempt.block_id,
    artifact_uri: attempt.artifact_uri,
    kind: attempt.kind,
    status: attempt.status,
    error_code: attempt.error_code,
    error_message: attempt.error_message,
    requested_at: attempt.requested_at,
    completed_at: attempt.completed_at
  });
  return attempt;
}

function failAfterResolution(
  store: ConsolerStore,
  base: {
    action_id: string;
    agent_id: string;
    block_id: string;
    artifact_uri: string;
    kind: string;
    requested_at: string;
  },
  code: ArtifactRetrievalErrorCode,
  message: string
): FetchArtifactViewResult {
  const retrieval = recordAttempt(store, base, {
    status: "failed",
    error_code: code,
    error_message: message
  });
  return { ok: false, retrieval, error: { code, message } };
}

async function withAgentClient<T>(
  entry: RegistryAgentEntry,
  fn: (client: JsonRpcAgentClient) => Promise<T>
): Promise<T> {
  const client = new JsonRpcAgentClient({ entry });
  try {
    return await fn(client);
  } finally {
    client.kill();
  }
}

export async function fetchArtifactViewForStore(
  store: ConsolerStore,
  rootDir: string | undefined,
  actionId: string,
  blockId: string
): Promise<FetchArtifactViewResult> {
  const action = store.getAction(actionId);
  if (!action) {
    return {
      ok: false,
      error: { code: "action_not_found", message: `Action not found: ${actionId}` }
    };
  }

  const resultBlocks = resultBlocksFromEvents(acceptedEventsForAction(store, actionId));
  const block = resultBlocks.find((item) => item.block_id === blockId);
  if (!block) {
    return {
      ok: false,
      error: {
        code: "artifact_block_not_found",
        message: `No result block ${blockId} on accepted action.succeeded for ${actionId}`
      }
    };
  }
  if (block.type !== "artifact") {
    return {
      ok: false,
      error: {
        code: "artifact_block_not_artifact",
        message: `Block ${blockId} is type ${block.type}, not artifact`
      }
    };
  }

  const content = parseArtifactBlockContent(block);
  if (!content) {
    return {
      ok: false,
      error: {
        code: "artifact_block_not_artifact",
        message: `Block ${blockId} has invalid artifact content`
      }
    };
  }

  const requestedAt = new Date().toISOString();
  const auditBase = {
    action_id: actionId,
    agent_id: action.agent_id,
    block_id: blockId,
    artifact_uri: content.uri,
    kind: content.kind,
    requested_at: requestedAt
  };

  const manifest = store.getManifest(action.agent_id);
  if (!manifest) {
    return failAfterResolution(store, auditBase, "manifest_missing", `No cached manifest for ${action.agent_id}`);
  }

  const capabilityCheck = capabilitySupports(manifest, content.uri, content.kind);
  if (!capabilityCheck.ok) {
    return failAfterResolution(
      store,
      auditBase,
      capabilityCheck.code,
      capabilityCheck.message
    );
  }

  let entry: RegistryAgentEntry;
  try {
    entry = getEnabledAgent(loadRegistry(rootDir), action.agent_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failAfterResolution(store, auditBase, "agent_not_registered", message);
  }

  const requestParams: Record<string, unknown> = {
    artifact_uri: content.uri,
    kind: content.kind,
    block_id: blockId,
    action_id: actionId
  };
  if (content.metadata) {
    requestParams.metadata = content.metadata;
  }

  let rawResult: unknown;
  try {
    rawResult = await withAgentClient(entry, (client) =>
      client.request("agent.get_artifact_view", requestParams)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failAfterResolution(store, auditBase, "agent_error", message);
  }

  const serialized = JSON.stringify(rawResult);
  if (Buffer.byteLength(serialized, "utf8") > ARTIFACT_VIEW_MAX_RESPONSE_BYTES) {
    return failAfterResolution(
      store,
      auditBase,
      "response_too_large",
      `Agent response exceeds ${ARTIFACT_VIEW_MAX_RESPONSE_BYTES} bytes`
    );
  }

  const validated = validateArtifactView(rawResult);
  if (!validated.ok) {
    return failAfterResolution(
      store,
      auditBase,
      "invalid_artifact_view",
      "Agent returned an invalid ArtifactView"
    );
  }

  const retrieval = recordAttempt(store, auditBase, { status: "succeeded" });
  return { ok: true, retrieval, view: validated.value as ArtifactView };
}

export function listArtifactRetrievalAttempts(
  store: ConsolerStore,
  actionId: string
): ArtifactRetrievalAttempt[] {
  return store.listArtifactRetrievalsForAction(actionId).map(toAttempt);
}
