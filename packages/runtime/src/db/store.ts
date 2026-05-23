import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

import type {
  ActionDraft,
  ActionEvent,
  ActionPlan,
  AgentManifest,
  ApprovalToken,
  ContextSnapshot,
  RegistryAgentEntry
} from "@consoler/protocol";
import { hashCanonical } from "@consoler/protocol";

import { databasePath } from "../paths.js";
import { HISTORY_INDEXES_SQL } from "./indexes.js";
import { SCHEMA_SQL } from "./schema.js";

export interface StoredEvent {
  id: number;
  event_id: string | null;
  run_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  type: string;
  seq: number | null;
  epoch: number | null;
  timestamp: string | null;
  payload_json: string;
  accepted: number;
  reject_reason: string | null;
  created_at: string;
}

export class ConsolerStore {
  readonly db: Database.Database;

  constructor(rootDir?: string) {
    const dbPath = databasePath(rootDir);
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);
    this.db.exec(HISTORY_INDEXES_SQL);
  }

  upsertRegistryAgent(entry: RegistryAgentEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO agents (agent_id, name, cwd, command, args_json, env_json, enabled, updated_at)
      VALUES (@agent_id, @name, @cwd, @command, @args_json, @env_json, @enabled, @updated_at)
      ON CONFLICT(agent_id) DO UPDATE SET
        name = excluded.name,
        cwd = excluded.cwd,
        command = excluded.command,
        args_json = excluded.args_json,
        env_json = excluded.env_json,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `);
    stmt.run({
      agent_id: entry.agent_id,
      name: entry.name,
      cwd: entry.cwd,
      command: entry.command,
      args_json: JSON.stringify(entry.args),
      env_json: entry.env ? JSON.stringify(entry.env) : null,
      enabled: entry.enabled ? 1 : 0,
      updated_at: new Date().toISOString()
    });
  }

  saveManifest(manifest: AgentManifest): void {
    const manifestJson = JSON.stringify(manifest);
    const stmt = this.db.prepare(`
      INSERT INTO manifests (agent_id, manifest_json, manifest_hash, updated_at)
      VALUES (@agent_id, @manifest_json, @manifest_hash, @updated_at)
      ON CONFLICT(agent_id) DO UPDATE SET
        manifest_json = excluded.manifest_json,
        manifest_hash = excluded.manifest_hash,
        updated_at = excluded.updated_at
    `);
    stmt.run({
      agent_id: manifest.agent_id,
      manifest_json: manifestJson,
      manifest_hash: hashCanonical(manifest),
      updated_at: new Date().toISOString()
    });
  }

  getManifest(agentId: string): AgentManifest | null {
    const row = this.db
      .prepare(`SELECT manifest_json FROM manifests WHERE agent_id = ?`)
      .get(agentId) as { manifest_json: string } | undefined;
    return row ? (JSON.parse(row.manifest_json) as AgentManifest) : null;
  }

  saveAction(draft: ActionDraft): void {
    this.db
      .prepare(
        `INSERT INTO actions (action_id, agent_id, command, args_json, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(draft.action_id, draft.agent_id, draft.command, JSON.stringify(draft.args), draft.created_at);
  }

  getAction(actionId: string): ActionDraft | null {
    const row = this.db
      .prepare(`SELECT action_id, agent_id, command, args_json, created_at FROM actions WHERE action_id = ?`)
      .get(actionId) as
      | {
          action_id: string;
          agent_id: string;
          command: string;
          args_json: string;
          created_at: string;
        }
      | undefined;
    if (!row) return null;
    return {
      action_id: row.action_id,
      agent_id: row.agent_id,
      command: row.command,
      args: JSON.parse(row.args_json) as Record<string, unknown>,
      created_at: row.created_at
    };
  }

  savePlan(plan: ActionPlan, planHash: string): void {
    this.db
      .prepare(
        `INSERT INTO plans (plan_id, action_id, agent_id, command, plan_json, plan_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        plan.plan_id,
        plan.action_id,
        plan.agent_id,
        plan.command,
        JSON.stringify(plan),
        planHash,
        plan.created_at
      );
  }

  getLatestPlan(actionId: string): { plan: ActionPlan; plan_hash: string } | null {
    const row = this.db
      .prepare(
        `SELECT plan_json, plan_hash FROM plans WHERE action_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(actionId) as { plan_json: string; plan_hash: string } | undefined;
    if (!row) return null;
    return { plan: JSON.parse(row.plan_json) as ActionPlan, plan_hash: row.plan_hash };
  }

  saveContext(snapshot: ContextSnapshot, snapshotHash: string, actionId: string, agentId: string, command: string): void {
    this.db
      .prepare(
        `INSERT INTO contexts (snapshot_id, action_id, agent_id, command, snapshot_json, snapshot_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        snapshot.snapshot_id,
        actionId,
        agentId,
        command,
        JSON.stringify(snapshot),
        snapshotHash,
        snapshot.created_at
      );
  }

  getLatestContext(actionId: string): { snapshot: ContextSnapshot; snapshot_hash: string } | null {
    const row = this.db
      .prepare(
        `SELECT snapshot_json, snapshot_hash FROM contexts WHERE action_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(actionId) as { snapshot_json: string; snapshot_hash: string } | undefined;
    if (!row) return null;
    return { snapshot: JSON.parse(row.snapshot_json) as ContextSnapshot, snapshot_hash: row.snapshot_hash };
  }

  saveApproval(token: ApprovalToken): void {
    this.db
      .prepare(
        `INSERT INTO approvals (
          approval_id, action_id, agent_id, command,
          args_hash, plan_hash, context_snapshot_hash, side_effects_hash,
          preview_hash, material_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        token.approval_id,
        token.action_id,
        token.agent_id,
        token.command,
        token.args_hash,
        token.plan_hash,
        token.context_snapshot_hash,
        token.side_effects_hash,
        token.preview_hash ?? null,
        JSON.stringify(token.material),
        token.created_at
      );
  }

  createRun(runId: string, actionId: string, agentId: string, command: string): void {
    this.db
      .prepare(
        `INSERT INTO runs (run_id, action_id, agent_id, command, status, started_at)
         VALUES (?, ?, ?, ?, 'running', ?)`
      )
      .run(runId, actionId, agentId, command, new Date().toISOString());
  }

  closeRun(runId: string, status: string): void {
    this.db
      .prepare(`UPDATE runs SET status = ?, ended_at = ? WHERE run_id = ?`)
      .run(status, new Date().toISOString(), runId);
  }

  getRun(runId: string): { run_id: string; action_id: string; status: string } | null {
    const row = this.db
      .prepare(`SELECT run_id, action_id, status FROM runs WHERE run_id = ?`)
      .get(runId) as { run_id: string; action_id: string; status: string } | undefined;
    return row ?? null;
  }

  getLatestRunForAction(actionId: string): { run_id: string; status: string } | null {
    const row = this.db
      .prepare(`SELECT run_id, status FROM runs WHERE action_id = ? ORDER BY started_at DESC LIMIT 1`)
      .get(actionId) as { run_id: string; status: string } | undefined;
    return row ?? null;
  }

  insertEvent(record: StoredEvent): void {
    this.db
      .prepare(
        `INSERT INTO events (
          event_id, run_id, action_id, agent_id, command, type, seq, epoch, timestamp,
          payload_json, accepted, reject_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.event_id,
        record.run_id,
        record.action_id,
        record.agent_id,
        record.command,
        record.type,
        record.seq,
        record.epoch,
        record.timestamp,
        record.payload_json,
        record.accepted,
        record.reject_reason,
        record.created_at
      );
  }

  listAcceptedEventsForRun(runId: string): ActionEvent[] {
    const rows = this.db
      .prepare(
        `SELECT payload_json FROM events WHERE run_id = ? AND accepted = 1 ORDER BY seq ASC, id ASC`
      )
      .all(runId) as { payload_json: string }[];
    return rows.map((row) => JSON.parse(row.payload_json) as ActionEvent);
  }

  listEventsForAction(actionId: string): StoredEvent[] {
    return this.db
      .prepare(`SELECT * FROM events WHERE action_id = ? ORDER BY id ASC`)
      .all(actionId) as StoredEvent[];
  }

  getLastAcceptedSeq(runId: string): number {
    const row = this.db
      .prepare(`SELECT MAX(seq) AS max_seq FROM events WHERE run_id = ? AND accepted = 1`)
      .get(runId) as { max_seq: number | null } | undefined;
    return row?.max_seq ?? 0;
  }

  isRunTerminal(runId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM events
         WHERE run_id = ? AND accepted = 1
           AND type IN ('action.succeeded', 'action.failed', 'action.cancelled')
         LIMIT 1`
      )
      .get(runId);
    return Boolean(row);
  }

  hasPlan(actionId: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM plans WHERE action_id = ? LIMIT 1`).get(actionId);
    return Boolean(row);
  }

  hasContext(actionId: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM contexts WHERE action_id = ? LIMIT 1`).get(actionId);
    return Boolean(row);
  }

  hasApproval(actionId: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM approvals WHERE action_id = ? LIMIT 1`).get(actionId);
    return Boolean(row);
  }

  listRunsForAction(actionId: string): Array<{
    run_id: string;
    action_id: string;
    agent_id: string;
    command: string;
    status: string;
    started_at: string;
    ended_at: string | null;
  }> {
    return this.db
      .prepare(
        `SELECT run_id, action_id, agent_id, command, status, started_at, ended_at
         FROM runs WHERE action_id = ? ORDER BY started_at DESC`
      )
      .all(actionId) as Array<{
      run_id: string;
      action_id: string;
      agent_id: string;
      command: string;
      status: string;
      started_at: string;
      ended_at: string | null;
    }>;
  }

  listApprovalsForAction(actionId: string): ApprovalToken[] {
    const rows = this.db
      .prepare(
        `SELECT approval_id, action_id, agent_id, command, args_hash, plan_hash,
                context_snapshot_hash, side_effects_hash, preview_hash, material_json, created_at
         FROM approvals WHERE action_id = ? ORDER BY created_at ASC`
      )
      .all(actionId) as Array<{
      approval_id: string;
      action_id: string;
      agent_id: string;
      command: string;
      args_hash: string;
      plan_hash: string;
      context_snapshot_hash: string;
      side_effects_hash: string;
      preview_hash: string | null;
      material_json: string;
      created_at: string;
    }>;
    return rows.map((row) => {
      const token: ApprovalToken = {
        approval_id: row.approval_id,
        action_id: row.action_id,
        agent_id: row.agent_id,
        command: row.command,
        scope: "execute",
        args_hash: row.args_hash,
        plan_hash: row.plan_hash,
        context_snapshot_hash: row.context_snapshot_hash,
        side_effects_hash: row.side_effects_hash,
        material: JSON.parse(row.material_json) as ApprovalToken["material"],
        created_at: row.created_at
      };
      if (row.preview_hash) token.preview_hash = row.preview_hash;
      return token;
    });
  }

  countEventsForAction(actionId: string): { accepted: number; rejected: number } {
    const row = this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) AS accepted,
           SUM(CASE WHEN accepted = 0 THEN 1 ELSE 0 END) AS rejected
         FROM events WHERE action_id = ?`
      )
      .get(actionId) as { accepted: number | null; rejected: number | null } | undefined;
    return {
      accepted: row?.accepted ?? 0,
      rejected: row?.rejected ?? 0
    };
  }

  listRecentActions(limit: number, command?: string): Array<{
    action_id: string;
    agent_id: string;
    command: string;
    args_json: string;
    created_at: string;
    latest_run_id: string | null;
    latest_run_status: string | null;
  }> {
    const clauses: string[] = [];
    const params: Record<string, unknown> = { limit };
    if (command) {
      clauses.push("a.command = @command");
      params.command = command;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(
        `SELECT
           a.action_id,
           a.agent_id,
           a.command,
           a.args_json,
           a.created_at,
           lr.run_id AS latest_run_id,
           lr.status AS latest_run_status
         FROM actions a
         LEFT JOIN (
           SELECT r1.run_id, r1.action_id, r1.status
           FROM runs r1
           INNER JOIN (
             SELECT action_id, MAX(started_at) AS max_started
             FROM runs
             GROUP BY action_id
           ) latest ON latest.action_id = r1.action_id AND latest.max_started = r1.started_at
         ) lr ON lr.action_id = a.action_id
         ${where}
         ORDER BY a.created_at DESC
         LIMIT @limit`
      )
      .all(params) as Array<{
      action_id: string;
      agent_id: string;
      command: string;
      args_json: string;
      created_at: string;
      latest_run_id: string | null;
      latest_run_status: string | null;
    }>;
  }
}
