// Tauri-shell UI glue. Sends the pairing code to the sidecar worker via a
// local IPC bridge (in production) or directly to the API (in dev mode where
// the worker is already running and this page is just a status panel).

const status = document.getElementById('status');
const button = document.getElementById('pair');

button.addEventListener('click', async () => {
  const code = document.getElementById('code').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    status.textContent = 'Code must be 6 letters/digits.';
    return;
  }
  status.textContent = `Pairing with code ${code}…`;

  try {
    // In the Tauri build, this would be: window.__TAURI__.invoke('pair', { code })
    // For dev preview we hit the API directly so the page is testable in a browser.
    const apiUrl = window.SURVEILLANCE_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/api/pairing/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        hostname: 'tauri-ui-preview',
        platform: navigator.platform,
        version: '0.1.0',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      status.textContent = `Error: ${data.error}`;
      return;
    }
    status.textContent = `Paired ✓ ${data.connector_id.slice(0, 8)}…`;
  } catch (e) {
    status.textContent = `Network error: ${e.message}`;
  }
});
