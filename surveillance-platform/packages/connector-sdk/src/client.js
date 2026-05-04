// HTTP client for the connector → API side of the wire.
// Used by apps/connector-tauri's Node worker. Runtime-agnostic (works under
// Tauri sidecar, plain Node, or a test harness).

export class ApiClient {
  constructor({ apiUrl, token = null, fetchImpl = globalThis.fetch }) {
    if (!apiUrl) throw new Error('ApiClient: apiUrl required');
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.token = token;
    this.fetch = fetchImpl;
  }

  setToken(token) {
    this.token = token;
  }

  async #req(method, path, { body, signal } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    const res = await this.fetch(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  // Step 2: connector claims a pairing code and receives a long-lived token.
  pairingClaim(payload) {
    return this.#req('POST', '/api/pairing/claim', { body: payload });
  }

  // Step 5: long-poll for the next queued command.
  // Returns { command } on hit, { command: null } on timeout.
  nextCommand({ signal } = {}) {
    return this.#req('GET', '/api/connector/commands/next', { signal });
  }

  // Step 8: upload result. Snapshot is base64-encoded JPEG in the JSON body
  // (small enough for typical previews; swap to multipart if we ever stream
  // bigger artefacts).
  uploadResult(commandId, result) {
    return this.#req('POST', `/api/connector/commands/${commandId}/result`, {
      body: result,
    });
  }

  heartbeat() {
    return this.#req('POST', '/api/connector/heartbeat');
  }
}
