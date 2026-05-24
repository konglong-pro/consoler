export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cwd TEXT NOT NULL,
  command TEXT NOT NULL,
  args_json TEXT NOT NULL,
  env_json TEXT,
  enabled INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS manifests (
  agent_id TEXT PRIMARY KEY,
  manifest_json TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actions (
  action_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  args_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  run_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  type TEXT NOT NULL,
  seq INTEGER,
  epoch INTEGER,
  timestamp TEXT,
  payload_json TEXT NOT NULL,
  accepted INTEGER NOT NULL,
  reject_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  approval_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  args_hash TEXT NOT NULL,
  plan_hash TEXT NOT NULL,
  context_snapshot_hash TEXT NOT NULL,
  side_effects_hash TEXT NOT NULL,
  preview_hash TEXT,
  material_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contexts (
  snapshot_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  plan_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  plan_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  interaction_id TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  responded_at TEXT,
  closed_at TEXT,
  UNIQUE(run_id, interaction_id)
);
`;
