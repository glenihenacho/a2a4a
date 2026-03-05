import * as schema from "./schema.js";

let db = null;

const connectionString = process.env.DATABASE_URL;

if (connectionString) {
  try {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { default: postgres } = await import("postgres");
    const client = postgres(connectionString);
    db = drizzle(client, { schema });
  } catch (err) {
    console.warn("Failed to initialize database connection:", err.message);
  }
} else {
  console.warn("DATABASE_URL not set — running without database (API routes will return 503)");
}

export function isDbAvailable() {
  return db !== null;
}

export { db, schema };
