# Connector (Tauri)

Local runtime that lives on the customer's network. Two layers:

- **Tauri shell** (`src-tauri/`, `ui/`) — desktop tray app the customer installs. Provides the pairing-code prompt, status indicator, and lifecycle (auto-launch, auto-update). Requires Rust toolchain to build.
- **Node worker** (`worker/`) — the actual command-loop process. Handles pairing, long-poll, RTSP probing, snapshot capture, and result upload. Runs as a Tauri sidecar in production, or standalone via `npm run dev` for headless testing on a server-grade box.

The worker is what implements steps 2, 5, 6, 7, 8 of the onboarding flow.

## Headless dev

```bash
# pair against a running API
SURVEILLANCE_API_URL=http://localhost:4000 \
  SURVEILLANCE_PAIRING_CODE=ABC123 \
  npm run dev
```

Subsequent runs reuse the cached connector token from
`~/.surveillance-connector/connector.json`.

## Tauri build (production)

The `src-tauri/` directory is intentionally minimal — `tauri init` generates
the rest. We commit `tauri.conf.json` so CI can build without prompts.
