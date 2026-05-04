-- Surveillance platform schema (SQLite).
--
-- Why SQLite: zero-ops for MVP and the connector workload is write-light
-- (one row per camera + one row per validation attempt). Migrate to Postgres
-- when we need cross-region replication or external analytics.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pairing_codes (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  expires_at      TEXT NOT NULL,
  claimed_at      TEXT,
  claimed_by      TEXT,            -- connector_id once claimed
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connectors (
  id              TEXT PRIMARY KEY,
  hostname        TEXT NOT NULL,
  platform        TEXT NOT NULL,
  version         TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'online',
  last_seen_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);

CREATE TABLE IF NOT EXISTS cameras (
  id                  TEXT PRIMARY KEY,
  connector_id        TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  rtsp_url            TEXT NOT NULL,        -- includes credentials; never echoed raw to dashboard
  status              TEXT NOT NULL DEFAULT 'draft',
  last_validated_at   TEXT,
  last_failure_code   TEXT,
  last_error_message  TEXT,
  snapshot_path       TEXT,                 -- relative path under data/snapshots/
  width               INTEGER,
  height              INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cameras_connector ON cameras(connector_id);

CREATE TABLE IF NOT EXISTS commands (
  id              TEXT PRIMARY KEY,
  connector_id    TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued',
  payload         TEXT NOT NULL,            -- JSON
  result          TEXT,                     -- JSON; populated on completion
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_at      TEXT,
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_commands_queue ON commands(connector_id, status, created_at);
