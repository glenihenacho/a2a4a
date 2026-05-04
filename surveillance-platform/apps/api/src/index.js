import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { db } from './db/index.js';
import { pairingRoutes } from './routes/pairing.js';
import { connectorRoutes, connectorAuthRoutes } from './routes/connectors.js';
import { cameraRoutes } from './routes/cameras.js';
import { commandRoutes } from './routes/commands.js';
import { requireConnector } from './routes/auth.js';

// Eager DB init so the schema is ready before the first request.
db();

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      // Dashboard origin in dev + Tauri (tauri://) in prod connector.
      const allowed = (process.env.DASHBOARD_ORIGIN || 'http://localhost:4001').split(',');
      if (!origin) return '*';
      if (allowed.includes(origin)) return origin;
      if (origin.startsWith('tauri://')) return origin;
      return null;
    },
    credentials: true,
  })
);

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'surveillance-api', t: new Date().toISOString() })
);

// Public (dashboard-side) routes.
app.route('/', pairingRoutes);
app.route('/', connectorRoutes);
app.route('/', cameraRoutes);

// Connector-only routes (Bearer auth).
const connectorApi = new Hono();
connectorApi.use('*', requireConnector);
connectorApi.route('/', commandRoutes);
connectorApi.route('/', connectorAuthRoutes);
app.route('/', connectorApi);

// Only bind a listener when invoked directly. Tests and other consumers can
// `import app` and use `app.request(...)` without the port being held.
import { fileURLToPath } from 'node:url';
const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntrypoint) {
  const port = Number(process.env.API_PORT || 4000);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[api] listening on :${info.port}`);
  });
}

export default app;
