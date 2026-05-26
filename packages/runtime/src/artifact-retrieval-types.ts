import type { ArtifactView } from "@consoler/protocol";

export type ArtifactRetrievalStatus = "succeeded" | "failed";

export type ArtifactRetrievalErrorCode =
  | "action_not_found"
  | "artifact_block_not_found"
  | "artifact_block_not_artifact"
  | "manifest_missing"
  | "artifact_retrieval_unsupported"
  | "agent_not_registered"
  | "agent_error"
  | "invalid_artifact_view"
  | "response_too_large";

export interface ArtifactRetrievalAttempt {
  retrieval_id: string;
  action_id: string;
  agent_id: string;
  block_id: string;
  artifact_uri: string;
  kind: string;
  status: ArtifactRetrievalStatus;
  error_code: string | null;
  error_message: string | null;
  requested_at: string;
  completed_at: string | null;
}

export type FetchArtifactViewResult =
  | { ok: true; retrieval: ArtifactRetrievalAttempt; view: ArtifactView }
  | {
      ok: false;
      retrieval?: ArtifactRetrievalAttempt;
      error: { code: ArtifactRetrievalErrorCode; message: string };
    };

export const ARTIFACT_VIEW_MAX_RESPONSE_BYTES = 1_048_576;
