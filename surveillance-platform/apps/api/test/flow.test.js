import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';

const j = async (res) => res.json();

test('end-to-end pairing → command → result', async () => {
  // Step 1
  const pair = await j(await app.request('/api/pairing', { method: 'POST' }));
  assert.match(pair.code, /^[A-Z0-9]{6}$/);

  // Step 2
  const claim = await j(
    await app.request('/api/pairing/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: pair.code,
        hostname: 'test-host',
        platform: 'linux',
        version: '0.1.0',
      }),
    })
  );
  assert.ok(claim.connector_token);

  const auth = { authorization: `Bearer ${claim.connector_token}` };

  // Step 3 + 4
  const create = await j(
    await app.request('/api/cameras', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        connector_id: claim.connector_id,
        label: 'Front door',
        rtsp_url: 'rtsp://user:pw@192.168.1.50:554/Streaming/Channels/101',
      }),
    })
  );
  assert.equal(create.camera.status, 'validating');
  assert.ok(create.command_id);

  // Step 5 — connector polls (we don't wait the full long-poll; the queued cmd is there immediately)
  const next = await j(
    await app.request('/api/connector/commands/next', { headers: auth })
  );
  assert.equal(next.command.kind, 'validate_rtsp');
  assert.equal(next.command.payload.camera_id, create.camera.id);

  // Steps 6, 7, 8 — connector reports back
  const result = await j(
    await app.request(`/api/connector/commands/${next.command.id}/result`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'succeeded',
        width: 1920,
        height: 1080,
        snapshot_b64:
          '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PT',
        duration_ms: 1234,
      }),
    })
  );
  assert.equal(result.ok, true);

  // Step 9
  const cam = await j(await app.request(`/api/cameras/${create.camera.id}`));
  assert.equal(cam.status, 'validated');
  assert.equal(cam.width, 1920);
  assert.ok(cam.snapshot_url);
});
