// ─── STRUCTURED LOGGING ───
// JSON-formatted logs with request IDs for production observability.
// In dev, falls back to readable console output.

import { randomUUID } from "node:crypto";

const IS_PROD = process.env.NODE_ENV === "production";

function formatLog(level, message, context) {
  if (IS_PROD) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    });
  }
  // Dev: readable format
  const ctx = Object.keys(context).length
    ? " " + JSON.stringify(context)
    : "";
  return `[${level.toUpperCase()}] ${message}${ctx}`;
}

export const log = {
  info(message, context = {}) {
    console.log(formatLog("info", message, context));
  },
  warn(message, context = {}) {
    console.warn(formatLog("warn", message, context));
  },
  error(message, context = {}) {
    console.error(formatLog("error", message, context));
  },
};

// ─── REQUEST ID MIDDLEWARE ───
// Attaches a unique request ID to each request for log correlation.

export function requestId() {
  return async (c, next) => {
    const id = c.req.header("x-request-id") || randomUUID();
    c.set("requestId", id);
    c.header("X-Request-Id", id);
    await next();
  };
}

// ─── REQUEST LOGGER MIDDLEWARE ───
// Logs method, path, status, and duration for every request.

export function requestLogger() {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";
    log[level](`${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      duration_ms: duration,
      requestId: c.get("requestId"),
    });
  };
}
