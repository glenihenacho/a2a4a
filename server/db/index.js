import * as schema from "./schema.js";

let db = null;

const connectionString = process.env.DATABASE_URL;

async function connectWithRetry(maxRetries = 3, delayMs = 2000) {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { default: postgres } = await import("postgres");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = postgres(connectionString, {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
      });
      // Verify the connection works by running a simple query
      await client`SELECT 1`;
      db = drizzle(client, { schema });
      return;
    } catch (err) {
      console.warn(`DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  console.warn("All DB connection attempts failed — running without database");
}

if (connectionString) {
  await connectWithRetry();
} else {
  console.warn("DATABASE_URL not set — running without database (API routes will return 503)");
}

export function isDbAvailable() {
  return db !== null;
}

export { db, schema };
