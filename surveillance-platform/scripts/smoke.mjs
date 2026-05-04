// End-to-end smoke test: exercises the full 9-step flow against a running API.
//
//   node scripts/smoke.mjs            # assumes API at http://localhost:4000
//   API_URL=... node scripts/smoke.mjs

import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const j = async (res) => {
  const t = await res.text();
  const d = t ? JSON.parse(t) : null;
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(d)}`);
  return d;
};

const log = (n, msg) => console.log(`[step ${n}] ${msg}`);

const PLACEHOLDER_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA' +
  'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA' +
  'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3' +
  'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm' +
  'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMB' +
  'AAIRAxEAPwD3+iiigD//2Q==';

const main = async () => {
  log(0, `using API ${API_URL}`);
  await j(await fetch(`${API_URL}/api/health`));

  // Step 1
  const pair = await j(await fetch(`${API_URL}/api/pairing`, { method: 'POST' }));
  log(1, `dashboard created pairing code ${pair.code}`);

  // Step 2
  const claim = await j(
    await fetch(`${API_URL}/api/pairing/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: pair.code,
        hostname: `${os.hostname()}-smoke`,
        platform: process.platform,
        version: '0.1.0',
      }),
    })
  );
  log(2, `connector paired as ${claim.connector_id.slice(0, 8)}…`);
  const auth = { authorization: `Bearer ${claim.connector_token}` };

  // Step 3 + 4
  const create = await j(
    await fetch(`${API_URL}/api/cameras`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        connector_id: claim.connector_id,
        label: 'Smoke-test camera',
        rtsp_url: 'rtsp://user:pw@192.168.1.50:554/Streaming/Channels/102',
      }),
    })
  );
  log(3, `dashboard submitted RTSP URL → camera ${create.camera.id.slice(0, 8)}… status=${create.camera.status}`);
  log(4, `API queued command ${create.command_id.slice(0, 8)}…`);

  // Step 5 — long poll. We don't need to wait the full timeout because the
  // command was queued before our poll started.
  const next = await j(
    await fetch(`${API_URL}/api/connector/commands/next`, { headers: auth })
  );
  if (!next.command) throw new Error('connector saw no command');
  log(5, `connector polled and got command ${next.command.id.slice(0, 8)}… kind=${next.command.kind}`);

  // Step 6 — simulated local validation (smoke test doesn't actually probe RTSP)
  log(6, `connector "validated" RTSP locally (simulated)`);

  // Step 7 — placeholder snapshot
  log(7, `connector "captured" snapshot (1×1 placeholder JPEG)`);

  // Step 8
  await j(
    await fetch(`${API_URL}/api/connector/commands/${next.command.id}/result`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'succeeded',
        width: 1920,
        height: 1080,
        snapshot_b64: PLACEHOLDER_JPEG_B64,
        duration_ms: 412,
      }),
    })
  );
  log(8, `connector uploaded result`);

  // Step 9
  await sleep(50);
  const cam = await j(await fetch(`${API_URL}/api/cameras/${create.camera.id}`));
  if (cam.status !== 'validated') throw new Error(`expected validated, got ${cam.status}`);
  if (!cam.snapshot_url) throw new Error('snapshot_url missing');

  // Pull the JPEG bytes too — proves the file landed on disk.
  const snapRes = await fetch(`${API_URL}${cam.snapshot_url}`);
  if (!snapRes.ok) throw new Error(`snapshot fetch failed: ${snapRes.status}`);
  const buf = Buffer.from(await snapRes.arrayBuffer());
  log(9, `dashboard fetched preview: status=${cam.status}, ${buf.length}B JPEG, dims=${cam.width}×${cam.height}`);

  console.log('\n✓ all 9 steps passed');
};

main().catch((e) => {
  console.error('\n✗ smoke failed:', e.message);
  process.exit(1);
});
