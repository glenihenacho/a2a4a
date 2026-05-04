import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  newId,
  newPairingCode,
  newConnectorToken,
  sha256,
  isoNow,
  isoIn,
} from '../util.js';
import { ConnectorStatus } from '@surveillance/shared/status';
import { PairingClaimReq } from '@surveillance/shared/schemas';

const PAIRING_TTL = Number(process.env.PAIRING_CODE_TTL_SECONDS || 600);

export const pairingRoutes = new Hono();

// Step 1: dashboard creates a pairing code.
pairingRoutes.post('/api/pairing', async (c) => {
  const id = newId();
  const code = newPairingCode();
  const expiresAt = isoIn(PAIRING_TTL);
  db().prepare(
    'INSERT INTO pairing_codes (id, code, expires_at) VALUES (?, ?, ?)'
  ).run(id, code, expiresAt);
  return c.json({ pairing_id: id, code, expires_at: expiresAt });
});

// Step 2: connector claims the code, receives long-lived token.
pairingRoutes.post('/api/pairing/claim', async (c) => {
  let body;
  try {
    body = PairingClaimReq.parse(await c.req.json());
  } catch (e) {
    return c.json({ error: 'invalid_payload', details: e.errors }, 400);
  }

  const d = db();
  const row = d
    .prepare('SELECT * FROM pairing_codes WHERE code = ?')
    .get(body.code);

  if (!row) return c.json({ error: 'unknown_code' }, 404);
  if (row.claimed_at) return c.json({ error: 'already_claimed' }, 409);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ error: 'expired' }, 410);
  }

  const connectorId = newId();
  const token = newConnectorToken();
  const tokenHash = sha256(token);
  const now = isoNow();

  const tx = d.transaction(() => {
    d.prepare(
      `INSERT INTO connectors (id, hostname, platform, version, token_hash, status, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      connectorId,
      body.hostname,
      body.platform,
      body.version,
      tokenHash,
      ConnectorStatus.ONLINE,
      now
    );
    d.prepare(
      'UPDATE pairing_codes SET claimed_at = ?, claimed_by = ? WHERE id = ?'
    ).run(now, connectorId, row.id);
  });
  tx();

  return c.json({
    connector_id: connectorId,
    connector_token: token,
    api_url: process.env.API_URL || `http://localhost:${process.env.API_PORT || 4000}`,
    poll_interval_ms: 2000,
  });
});

// Dashboard polls this to know when the connector has paired.
pairingRoutes.get('/api/pairing/:id', async (c) => {
  const row = db()
    .prepare('SELECT id, code, expires_at, claimed_at, claimed_by FROM pairing_codes WHERE id = ?')
    .get(c.req.param('id'));
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({
    pairing_id: row.id,
    code: row.code,
    expires_at: row.expires_at,
    claimed: !!row.claimed_at,
    connector_id: row.claimed_by,
  });
});
