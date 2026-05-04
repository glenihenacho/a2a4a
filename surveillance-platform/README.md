# Agentic Surveillance Platform

Turn existing CCTV (RTSP cameras) into agent-observable streams without touching the customer's network from the outside.

## Topology

```
+----------------+        +-----------------+        +---------------------+
|  Dashboard     |  HTTPS |  API + Broker   |  HTTPS |  Tauri Connector    |
|  (operators)   <--------+  (control plane)+-------->  (customer LAN)     |
+----------------+        +-----------------+        +----------+----------+
                                                                |
                                                                | RTSP (LAN-local)
                                                                v
                                                       +-----------------+
                                                       | Existing CCTV   |
                                                       | (NVR / cameras) |
                                                       +-----------------+
```

The connector lives inside the customer's network. The API never speaks RTSP and never sees the LAN. Cameras are validated where the cameras actually live: the connector pulls commands, executes them locally, and uploads results.

## Onboarding flow

1. Dashboard creates pairing code.
2. Tauri connector pairs with API.
3. Dashboard submits RTSP URL.
4. API queues `validate_rtsp` command.
5. Connector polls command.
6. Connector validates locally.
7. Connector captures snapshot.
8. Connector uploads result.
9. Dashboard displays preview.

See [docs/architecture/flow.md](docs/architecture/flow.md) for the wire-level walkthrough.

## Repo layout

```
surveillance-platform/
  apps/
    dashboard/          # Web control plane (React + Vite)
    api/                # Backend + command broker (Hono + SQLite)
    connector-tauri/    # Local customer-network runtime (Tauri shell + Node worker)
  packages/
    shared/             # Types, zod schemas, status contracts
    camera-core/        # RTSP templates, URL validation, ONVIF (later)
    connector-sdk/      # Pairing, polling, result upload
    ui/                 # Shared UI primitives
    config/             # Shared tooling config (tsconfig base, eslint base)
  infra/
    database/           # Schema + migrations
    docker/             # Dockerfiles + compose
    deploy/             # Fly / Render configs
  docs/
    product/
    architecture/
    onboarding/
```

## Quick start

```bash
cd surveillance-platform
npm install

# terminal 1 — API + DB
npm run dev:api

# terminal 2 — Dashboard
npm run dev:dashboard

# terminal 3 — Connector (simulated; real Tauri build needs Rust)
npm run dev:connector

# end-to-end smoke test (no UI)
npm run smoke
```

Default ports: API `4000`, Dashboard `4001`, Connector worker (no port; outbound only).
