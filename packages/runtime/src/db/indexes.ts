export const HISTORY_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON actions(created_at);
CREATE INDEX IF NOT EXISTS idx_runs_action_started ON runs(action_id, started_at);
CREATE INDEX IF NOT EXISTS idx_events_action_accepted ON events(action_id, accepted);
CREATE INDEX IF NOT EXISTS idx_events_run_accepted_seq ON events(run_id, accepted, seq);
CREATE INDEX IF NOT EXISTS idx_interactions_action_requested ON interactions(action_id, requested_at);
`;
