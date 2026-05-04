-- Canonical schema reference. The runtime SQLite copy lives at
-- apps/api/src/db/schema.sql and is applied by apps/api/src/db/index.js.
-- Keep this file in sync when migrating to Postgres for production.
--
-- The two diverge intentionally: this file uses TIMESTAMPTZ + UUID types
-- you'd want on Postgres; the runtime copy uses TEXT (ISO 8601) + TEXT (UUID
-- string) to stay portable on SQLite.

CREATE TABLE pairing_codes (
  id              UUID PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  claimed_at      TIMESTAMPTZ,
  claimed_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE connectors (
  id              UUID PRIMARY KEY,
  hostname        TEXT NOT NULL,
  platform        TEXT NOT NULL,
  version         TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'online',
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_connectors_status ON connectors(status);

CREATE TABLE cameras (
  id                  UUID PRIMARY KEY,
  connector_id        UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  rtsp_url            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft',
  last_validated_at   TIMESTAMPTZ,
  last_failure_code   TEXT,
  last_error_message  TEXT,
  snapshot_path       TEXT,
  width               INTEGER,
  height              INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_connector ON cameras(connector_id);

CREATE TABLE commands (
  id              UUID PRIMARY KEY,
  connector_id    UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued',
  payload         JSONB NOT NULL,
  result          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_commands_queue ON commands(connector_id, status, created_at);
