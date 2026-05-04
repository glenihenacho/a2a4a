// Connector worker — long-poll loop.
//
// Lifecycle:
//   1. Load (or create) ~/.surveillance-connector/connector.json
//   2. If unpaired, claim a pairing code from env or stdin → cache token
//   3. Long-poll /api/connector/commands/next forever
//   4. For each command, dispatch to handler, then upload result
//
// Designed to keep running across transient network failures. No retries on
// the server (commands are at-most-once); the connector retries the *poll*,
// not the command, so we don't double-execute on flaky links.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { ApiClient } from '@surveillance/connector-sdk/client';
import { probeRtsp } from '@surveillance/connector-sdk/rtsp';
import { CommandKind, CommandStatus, FailureCode } from '@surveillance/shared/status';

const API_URL = process.env.SURVEILLANCE_API_URL || 'http://localhost:4000';
const STATE_DIR =
  process.env.SURVEILLANCE_STATE_DIR ||
  path.join(os.homedir(), '.surveillance-connector');
const STATE_PATH = path.join(STATE_DIR, 'connector.json');

const loadState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const saveState = (state) => {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const promptForCode = async () => {
  if (process.env.SURVEILLANCE_PAIRING_CODE) {
    return process.env.SURVEILLANCE_PAIRING_CODE.toUpperCase();
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await rl.question('Pairing code: ');
  rl.close();
  return code.trim().toUpperCase();
};

// Step 2: pair.
const pair = async (api) => {
  const code = await promptForCode();
  const claim = await api.pairingClaim({
    code,
    hostname: os.hostname(),
    platform: process.platform,
    version: '0.1.0',
  });
  const state = {
    connector_id: claim.connector_id,
    connector_token: claim.connector_token,
    api_url: claim.api_url,
    poll_interval_ms: claim.poll_interval_ms,
    paired_at: new Date().toISOString(),
  };
  saveState(state);
  console.log(`[connector] paired as ${state.connector_id}`);
  return state;
};

// Steps 6 + 7.
const handleCommand = async (cmd) => {
  if (cmd.kind === CommandKind.VALIDATE_RTSP) {
    const result = await probeRtsp(cmd.payload.rtsp_url);
    if (result.ok) {
      return {
        status: CommandStatus.SUCCEEDED,
        width: result.width || undefined,
        height: result.height || undefined,
        snapshot_b64: result.jpegB64,
        duration_ms: result.durationMs,
      };
    }
    return {
      status: CommandStatus.FAILED,
      failure_code: result.code || FailureCode.UNKNOWN,
      error_message: result.message || 'unknown failure',
      duration_ms: result.durationMs,
    };
  }
  return {
    status: CommandStatus.FAILED,
    failure_code: FailureCode.UNKNOWN,
    error_message: `unsupported command kind: ${cmd.kind}`,
  };
};

const runLoop = async (api) => {
  console.log('[connector] entering command loop');
  for (;;) {
    try {
      // Step 5: long-poll.
      const { command } = await api.nextCommand();
      if (!command) continue;
      console.log(`[connector] picked up ${command.kind} ${command.id}`);
      const result = await handleCommand(command);
      // Step 8: upload.
      await api.uploadResult(command.id, result);
      console.log(`[connector] reported ${result.status} for ${command.id}`);
    } catch (e) {
      console.error('[connector] loop error:', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

const main = async () => {
  const apiClient = new ApiClient({ apiUrl: API_URL });
  let state = loadState();
  if (!state || !state.connector_token) {
    state = await pair(apiClient);
  } else {
    console.log(`[connector] resuming as ${state.connector_id}`);
  }
  apiClient.setToken(state.connector_token);
  await runLoop(apiClient);
};

main().catch((e) => {
  console.error('[connector] fatal:', e);
  process.exit(1);
});
