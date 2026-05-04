import { db } from '../db/index.js';
import { sha256, isoNow } from '../util.js';

// Connector auth: Bearer <token>. Token is hashed at rest.
export const requireConnector = async (c, next) => {
  const auth = c.req.header('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return c.json({ error: 'missing_token' }, 401);
  }
  const token = auth.slice('Bearer '.length).trim();
  if (!token) return c.json({ error: 'missing_token' }, 401);

  const row = db()
    .prepare('SELECT * FROM connectors WHERE token_hash = ?')
    .get(sha256(token));

  if (!row) return c.json({ error: 'invalid_token' }, 401);
  if (row.status === 'revoked') return c.json({ error: 'revoked' }, 403);

  // Heartbeat: any authenticated request advances last_seen_at.
  db().prepare('UPDATE connectors SET last_seen_at = ?, status = ? WHERE id = ?')
    .run(isoNow(), 'online', row.id);

  c.set('connector', row);
  await next();
};
