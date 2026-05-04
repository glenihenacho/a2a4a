import { Hono } from 'hono';
import path from 'node:path';
import fs from 'node:fs';
import { db, snapshotsDir } from '../db/index.js';
import { isoNow } from '../util.js';
import {
  CommandStatus,
  CommandKind,
  CameraStatus,
  FailureCode,
} from '@surveillance/shared/status';
import { CommandResultReq } from '@surveillance/shared/schemas';

const POLL_TIMEOUT_MS = Number(process.env.COMMAND_POLL_TIMEOUT_MS || 25_000);
const POLL_INTERVAL_MS = 500;

export const commandRoutes = new Hono();

const claimNext = (connectorId) => {
  const d = db();
  // Single-statement claim to avoid two connectors grabbing the same row.
  // (better-sqlite3 is synchronous, but we still want atomicity vs. crash mid-claim.)
  const tx = d.transaction(() => {
    const row = d
      .prepare(
        `SELECT * FROM commands
         WHERE connector_id = ? AND status = ?
         ORDER BY created_at ASC
         LIMIT 1`
      )
      .get(connectorId, CommandStatus.QUEUED);
    if (!row) return null;
    const now = isoNow();
    d.prepare(
      'UPDATE commands SET status = ?, claimed_at = ? WHERE id = ? AND status = ?'
    ).run(CommandStatus.CLAIMED, now, row.id, CommandStatus.QUEUED);
    return { ...row, status: CommandStatus.CLAIMED, claimed_at: now };
  });
  return tx();
};

// Step 5: connector long-polls.
commandRoutes.get('/api/connector/commands/next', async (c) => {
  const conn = c.get('connector');
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const cmd = claimNext(conn.id);
    if (cmd) {
      return c.json({
        command: {
          id: cmd.id,
          kind: cmd.kind,
          payload: JSON.parse(cmd.payload),
          claimed_at: cmd.claimed_at,
        },
      });
    }
    if (c.req.raw.signal?.aborted) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return c.json({ command: null });
});

// Step 8: connector uploads result.
commandRoutes.post('/api/connector/commands/:id/result', async (c) => {
  const conn = c.get('connector');
  const cmdId = c.req.param('id');

  let body;
  try {
    body = CommandResultReq.parse(await c.req.json());
  } catch (e) {
    return c.json({ error: 'invalid_payload', details: e.errors }, 400);
  }

  const d = db();
  const cmd = d
    .prepare('SELECT * FROM commands WHERE id = ? AND connector_id = ?')
    .get(cmdId, conn.id);
  if (!cmd) return c.json({ error: 'not_found' }, 404);
  if (cmd.status !== CommandStatus.CLAIMED) {
    return c.json({ error: 'not_claimed', status: cmd.status }, 409);
  }

  const now = isoNow();
  let snapshotPath = null;

  if (
    body.status === CommandStatus.SUCCEEDED &&
    body.snapshot_b64 &&
    cmd.kind === CommandKind.VALIDATE_RTSP
  ) {
    const payload = JSON.parse(cmd.payload);
    const filename = `${payload.camera_id}.jpg`;
    const abs = path.join(snapshotsDir(), filename);
    fs.writeFileSync(abs, Buffer.from(body.snapshot_b64, 'base64'));
    snapshotPath = filename;
  }

  const tx = d.transaction(() => {
    d.prepare(
      `UPDATE commands SET status = ?, completed_at = ?, result = ? WHERE id = ?`
    ).run(
      body.status,
      now,
      JSON.stringify({
        width: body.width,
        height: body.height,
        failure_code: body.failure_code,
        error_message: body.error_message,
        duration_ms: body.duration_ms,
        snapshot_saved: !!snapshotPath,
      }),
      cmd.id
    );

    if (cmd.kind === CommandKind.VALIDATE_RTSP) {
      const payload = JSON.parse(cmd.payload);
      if (body.status === CommandStatus.SUCCEEDED) {
        d.prepare(
          `UPDATE cameras
           SET status = ?, last_validated_at = ?, last_failure_code = NULL,
               last_error_message = NULL, snapshot_path = ?, width = ?, height = ?
           WHERE id = ?`
        ).run(
          CameraStatus.VALIDATED,
          now,
          snapshotPath,
          body.width || null,
          body.height || null,
          payload.camera_id
        );
      } else {
        d.prepare(
          `UPDATE cameras
           SET status = ?, last_validated_at = ?, last_failure_code = ?, last_error_message = ?
           WHERE id = ?`
        ).run(
          CameraStatus.UNREACHABLE,
          now,
          body.failure_code || FailureCode.UNKNOWN,
          body.error_message || null,
          payload.camera_id
        );
      }
    }
  });
  tx();

  return c.json({ ok: true });
});
