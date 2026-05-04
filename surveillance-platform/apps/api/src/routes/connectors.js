import { Hono } from 'hono';
import { db } from '../db/index.js';
import { ConnectorStatus } from '@surveillance/shared/status';
import { isoNow } from '../util.js';

const HEARTBEAT_WINDOW_SECONDS = 30;

const reshape = (row) => ({
  id: row.id,
  hostname: row.hostname,
  platform: row.platform,
  version: row.version,
  status: row.status,
  last_seen_at: row.last_seen_at,
  created_at: row.created_at,
});

// Public dashboard-facing routes.
export const connectorRoutes = new Hono();

connectorRoutes.get('/api/connectors', (c) => {
  const rows = db()
    .prepare('SELECT * FROM connectors ORDER BY created_at DESC')
    .all();
  const cutoff = Date.now() - HEARTBEAT_WINDOW_SECONDS * 1000;
  const reshaped = rows.map((r) => {
    if (r.status === ConnectorStatus.ONLINE && r.last_seen_at) {
      if (new Date(r.last_seen_at).getTime() < cutoff) {
        return reshape({ ...r, status: ConnectorStatus.OFFLINE });
      }
    }
    return reshape(r);
  });
  return c.json({ connectors: reshaped });
});

// Connector-authenticated routes (mounted behind requireConnector).
export const connectorAuthRoutes = new Hono();

connectorAuthRoutes.post('/api/connector/heartbeat', (c) => {
  const conn = c.get('connector');
  db().prepare('UPDATE connectors SET last_seen_at = ? WHERE id = ?')
    .run(isoNow(), conn.id);
  return c.json({ ok: true });
});
