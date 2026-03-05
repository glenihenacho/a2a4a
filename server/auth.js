import { db, isDbAvailable } from "./db/index.js";

let auth = null;

if (isDbAvailable()) {
  try {
    const { betterAuth } = await import("better-auth");
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
    auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
      secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
      database: drizzleAdapter(db, { provider: "pg" }),
      emailAndPassword: { enabled: true },
      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: "smb",
            input: true,
          },
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // update session every 24 hours
      },
      trustedOrigins: (() => {
        const origins = ["http://localhost:5173", "http://localhost:3001"];
        if (process.env.FLY_APP_NAME) origins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
        if (process.env.BETTER_AUTH_URL) origins.push(process.env.BETTER_AUTH_URL);
        return origins;
      })(),
    });
  } catch (err) {
    console.warn("Failed to initialize auth:", err.message);
  }
} else {
  console.warn("Auth disabled — no database connection");
}

export { auth };
