# Onboarding flow — wire-level walkthrough

The 9 steps in the README, expanded with HTTP shapes and state transitions.

## Actors

- **Dashboard** — operator's browser, talks only to the API.
- **API + broker** — Hono service on the public internet. Owns the database.
- **Connector** — Tauri/Node process inside the customer's LAN. Talks only
  outbound to the API. Has direct LAN access to RTSP cameras.

## State machines

```
pairing_codes:    issued ──claim──▶ claimed
                          ──ttl───▶ expired

connectors:       (created on claim) ──heartbeat─▶ online
                                     ──silence──▶ offline
                                     ──operator─▶ revoked

cameras:          draft ──submit──▶ validating ──succeed──▶ validated
                                                ──fail────▶ unreachable
                  validated ──resubmit──▶ validating

commands:         queued ──connector picks up──▶ claimed
                                                ──result──▶ succeeded | failed
                                                ──ttl────▶ expired
```

## The 9 steps

### 1. Dashboard creates pairing code

```
POST /api/pairing
→ { pairing_id, code: "ABC123", expires_at }
```

Code is 6 chars, ambiguity-free alphabet (no I/O/O0). TTL 10 min.

### 2. Tauri connector pairs with API

```
POST /api/pairing/claim
{ code: "ABC123", hostname, platform, version }
→ { connector_id, connector_token, api_url, poll_interval_ms }
```

The token is hashed at rest. Connector caches it on disk
(`~/.surveillance-connector/connector.json`); subsequent runs skip pairing.

### 3. Dashboard submits RTSP URL

```
POST /api/cameras
{ connector_id, label, rtsp_url }
→ { camera (status=validating), command_id, queued_at }
```

Server validates URL shape (rtsp://, routable host) before accepting. Camera
row is created in `validating`; rejection is synchronous.

### 4. API queues `validate_rtsp` command

Atomic with step 3: same transaction inserts into `commands` keyed to the
target connector. No outbound push — the connector will fetch on its own
schedule.

### 5. Connector polls command

```
GET /api/connector/commands/next       (Bearer connector_token)
→ { command: { id, kind, payload: { camera_id, rtsp_url } } } | { command: null }
```

Long-poll, default 25s timeout. Atomic claim flips status `queued → claimed`
in the same statement so two connectors can't grab the same row.

### 6. Connector validates locally

Inside the LAN:

1. Parse URL, refuse loopback / link-local.
2. TCP connect to host:port (4s timeout). Refused → `tcp_refused`,
   timed out → `tcp_timeout`.
3. If ffmpeg is on PATH: `ffmpeg -rtsp_transport tcp -i URL -frames:v 1 -f image2 -`
   for both stream auth and snapshot in one shot. 401/404 / protocol errors
   are classified into `rtsp_auth` / `rtsp_not_found` / `rtsp_protocol`.
4. If ffmpeg is missing: TCP success → placeholder JPEG with `simulated: true`.
   Production builds bundle ffmpeg as a sidecar; the placeholder path is dev-only.

### 7. Connector captures snapshot

Single JPEG, base64-encoded, included in the result body. We deliberately
keep this in the JSON payload rather than multipart — typical preview frames
are 30–80 KB and the simpler path is worth the small size hit.

### 8. Connector uploads result

```
POST /api/connector/commands/:id/result      (Bearer connector_token)
{ status: "succeeded", width, height, snapshot_b64, duration_ms }
or
{ status: "failed", failure_code, error_message, duration_ms }
→ { ok: true }
```

Server transactionally:
- updates `commands.status` and `commands.result`
- on success: writes the JPEG to `data/snapshots/<camera_id>.jpg`,
  flips `cameras.status` → `validated`, sets dimensions
- on failure: flips `cameras.status` → `unreachable`, records
  `last_failure_code` + `last_error_message`

### 9. Dashboard displays preview

Dashboard polls `GET /api/cameras` every 2s while any camera is in
`validating`. Once validated, it renders `<img src="/api/cameras/:id/snapshot">`.
A `?t=<last_validated_at>` cache-buster forces fresh image on revalidation.

## Failure modes worth calling out

- **Connector dies mid-job.** The command stays `claimed` forever and the
  camera stays `validating`. Future iteration: claim TTL → auto-requeue.
  For MVP we surface this as "stuck >60s" in the UI and let the operator
  re-submit.
- **RTSP creds with `@` or `?` in password.** URL parser handles encoding;
  operators must percent-encode. The dashboard's URL builder will do this
  for them once we add it.
- **Network partition between API and connector.** Long-poll fails, connector
  retries with backoff. No commands are lost — the queue is server-side.
