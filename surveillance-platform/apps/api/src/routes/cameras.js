import { Hono } from 'hono';
import path from 'node:path';
import fs from 'node:fs';
import { db, snapshotsDir } from '../db/index.js';
import { newId, isoNow } from '../util.js';
import { CameraCreateReq } from '@surveillance/shared/schemas';
import { CameraStatus, CommandKind, CommandStatus } from '@surveillance/shared/status';
import { maskRtspUrl } from '@surveillance/shared';
import { validateRtspSubmission } from '@surveillance/camera-core/validate';

const reshape = (row) => ({
  id: row.id,
  connector_id: row.connector_id,
  label: row.label,
  rtsp_url_masked: maskRtspUrl(row.rtsp_url),
  status: row.status,
  last_validated_at: row.last_validated_at,
  last_failure_code: row.last_failure_code,
  last_error_message: row.last_error_message,
  snapshot_url: row.snapshot_path ? `/api/cameras/${row.id}/snapshot` : null,
  width: row.width,
  height: row.height,
  created_at: row.created_at,
});

export const cameraRoutes = new Hono();

cameraRoutes.get('/api/cameras', (c) => {
  const rows = db()
    .prepare('SELECT * FROM cameras ORDER BY created_at DESC')
    .all();
  return c.json({ cameras: rows.map(reshape) });
});

cameraRoutes.get('/api/cameras/:id', (c) => {
  const row = db()
    .prepare('SELECT * FROM cameras WHERE id = ?')
    .get(c.req.param('id'));
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json(reshape(row));
});

// Step 3 + 4: dashboard submits RTSP URL → API queues validate_rtsp command.
cameraRoutes.post('/api/cameras', async (c) => {
  let body;
  try {
    body = CameraCreateReq.parse(await c.req.json());
  } catch (e) {
    return c.json({ error: 'invalid_payload', details: e.errors }, 400);
  }

  const parsed = validateRtspSubmission(body.rtsp_url);
  if (!parsed.ok) {
    return c.json({ error: 'invalid_rtsp_url', reason: parsed.reason }, 400);
  }

  const d = db();
  const connector = d
    .prepare("SELECT id, status FROM connectors WHERE id = ?")
    .get(body.connector_id);
  if (!connector) return c.json({ error: 'unknown_connector' }, 400);
  if (connector.status === 'revoked') {
    return c.json({ error: 'connector_revoked' }, 400);
  }

  const cameraId = newId();
  const commandId = newId();
  const now = isoNow();

  const tx = d.transaction(() => {
    d.prepare(
      `INSERT INTO cameras (id, connector_id, label, rtsp_url, status)
       VALUES (?, ?, ?, ?, ?)`
    ).run(cameraId, body.connector_id, body.label, body.rtsp_url, CameraStatus.VALIDATING);

    d.prepare(
      `INSERT INTO commands (id, connector_id, kind, status, payload)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      commandId,
      body.connector_id,
      CommandKind.VALIDATE_RTSP,
      CommandStatus.QUEUED,
      JSON.stringify({ camera_id: cameraId, rtsp_url: body.rtsp_url })
    );
  });
  tx();

  const row = d.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  return c.json({ camera: reshape(row), command_id: commandId, queued_at: now }, 201);
});

// Step 9: dashboard pulls the captured snapshot.
cameraRoutes.get('/api/cameras/:id/snapshot', (c) => {
  const row = db()
    .prepare('SELECT snapshot_path FROM cameras WHERE id = ?')
    .get(c.req.param('id'));
  if (!row || !row.snapshot_path) return c.json({ error: 'no_snapshot' }, 404);
  const abs = path.join(snapshotsDir(), path.basename(row.snapshot_path));
  if (!fs.existsSync(abs)) return c.json({ error: 'no_snapshot' }, 404);
  const buf = fs.readFileSync(abs);
  return new Response(buf, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'no-store',
    },
  });
});
