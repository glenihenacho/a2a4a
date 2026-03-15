import { db, isDbAvailable } from "./db/index.js";

let auth = null;

if (isDbAvailable()) {
  try {
    const { betterAuth } = await import("better-auth");
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
    auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || "http://localhost:3001",
      secret: (() => {
        const secret = process.env.BETTER_AUTH_SECRET;
        if (!secret) {
          if (process.env.NODE_ENV === "production") {
            throw new Error("BETTER_AUTH_SECRET must be set in production");
          }
          console.warn("BETTER_AUTH_SECRET not set — using insecure dev fallback");
          return "dev-secret-do-not-use-in-production";
        }
        return secret;
      })(),
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
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5, // 5 minutes
        },
      },
      advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        cookiePrefix: "ap",
        defaultCookieAttributes: {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        },
      },
      trustedOrigins: (() => {
        const origins = ["http://localhost:5173", "http://localhost:3001"];
        if (process.env.APP_URL) origins.push(process.env.APP_URL);
        if (process.env.FLY_APP_NAME) origins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
        if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL !== process.env.APP_URL) {
          origins.push(process.env.BETTER_AUTH_URL);
        }
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
