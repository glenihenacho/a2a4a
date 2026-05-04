# Customer onboarding runbook

For ops walking a new customer through their first camera. Assumes the
customer has at least one RTSP camera reachable on their LAN.

## Prerequisites

- Customer has admin access to a machine on the same LAN as the cameras
  (Windows, macOS, or Linux). A small box like an Intel NUC works.
- Outbound HTTPS to our control plane is allowed (it almost always is —
  no firewall change needed).
- They know their RTSP credentials. If not, send them the vendor cheat sheet
  in `docs/onboarding/rtsp-cheatsheet.md`.

## Walkthrough (15 min)

### 1. Install the connector (5 min)

Send the customer the signed installer for their OS. After install they get
a tray icon — that's the Tauri shell. The Node worker starts automatically
as a sidecar.

### 2. Generate a pairing code (30 sec)

In the dashboard → **Pair Connector** → **Generate pairing code**. A 6-char
code appears. Read it to the customer over a call, or paste it into your
chat thread with them.

### 3. Customer enters the code (30 sec)

Customer opens the tray app, types the code, hits **Pair this device**.
The dashboard flips to "✓ Connector paired" within 2 seconds.

### 4. Submit the first camera (1 min)

In **Cameras** → pick the connector → label the camera ("Front door") →
paste the RTSP URL. Use the vendor templates row to autofill the path
shape; ask the customer for the IP, port, username, password.

### 5. Watch the validation (10–30 sec)

Camera flips `validating → validated` once the snapshot arrives. The
preview thumbnail is shown inline. If it flips to `unreachable`, the
failure code tells you why:

| Code | Meaning | Likely fix |
|---|---|---|
| `tcp_refused` | Nothing on that port | Wrong IP or camera off |
| `tcp_timeout` | Routing/firewall issue | Check VLANs, ACLs |
| `rtsp_auth` | Credentials wrong | Re-check user/password |
| `rtsp_not_found` | Path wrong | Try a different vendor template |
| `rtsp_protocol` | Codec / transport mismatch | Try TCP transport, try sub-stream |

### 6. Add remaining cameras

Repeat step 4 for each camera. Most customers do 4–8 cameras at this stage.

## What to tell the customer

- "We never store your video — we store evidence clips when an alert fires."
- "Nothing inbound. The connector dials out to us; you don't need to open
  any firewall ports."
- "Your RTSP credentials never leave the connector. We only see masked URLs."

## Escalation

- Stuck `validating` >60s → restart the connector tray app. (See known
  failure modes in `docs/architecture/flow.md`.)
- All cameras `unreachable` despite valid URLs → the connector probably
  isn't on the same VLAN as the cameras. Check with the customer's IT.
