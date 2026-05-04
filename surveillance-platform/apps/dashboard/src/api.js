// Thin fetch wrapper. Vite proxies /api/* → API in dev.

const j = async (res) => {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.body = data;
    throw err;
  }
  return data;
};

export const api = {
  health: () => fetch('/api/health').then(j),

  createPairing: () => fetch('/api/pairing', { method: 'POST' }).then(j),
  getPairing: (id) => fetch(`/api/pairing/${id}`).then(j),

  listConnectors: () => fetch('/api/connectors').then(j),

  listCameras: () => fetch('/api/cameras').then(j),
  getCamera: (id) => fetch(`/api/cameras/${id}`).then(j),
  createCamera: (body) =>
    fetch('/api/cameras', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j),

  snapshotUrl: (cameraId) => `/api/cameras/${cameraId}/snapshot`,
};
