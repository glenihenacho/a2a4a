// ─── STRUCTURED LOGGER ───
// JSON logs in production (Logtail-compatible), readable in dev.
// Enriches every log line with environment and release.
//
// Logtail integration: set LOGTAIL_SOURCE_TOKEN to enable HTTP drain.
// Without a token, logs go to stdout/stderr only (still JSON in prod).

import { randomUUID } from "node:crypto";

const IS_PROD = process.env.NODE_ENV === "production";
const RELEASE = process.env.FLY_IMAGE_REF || process.env.npm_package_version || "dev";
const ENVIRONMENT = IS_PROD ? "production" : "development";

// ─── LOGTAIL HTTP DRAIN ───

const LOGTAIL_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN;
const LOGTAIL_URL = "https://in.logs.betterstack.com";
const logtailBuffer = [];
let flushTimer = null;

async function flushLogtail() {
  if (!LOGTAIL_TOKEN || logtailBuffer.length === 0) return;
  const batch = logtailBuffer.splice(0, logtailBuffer.length);
  try {
    await fetch(LOGTAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOGTAIL_TOKEN}`,
      },
      body: JSON.stringify(batch),
    });
  } catch {
    // Silently drop — we can't log about logging failures
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogtail();
  }, 1000);
}

// ─── CORE LOGGER ───

function buildEntry(level, message, context) {
  return {
    dt: new Date().toISOString(),
    level,
    message,
    environment: ENVIRONMENT,
    release: RELEASE,
    ...context,
  };
}

function emit(level, message, context = {}) {
  const entry = buildEntry(level, message, context);

  // Console output
  const out = IS_PROD ? JSON.stringify(entry) : formatDev(level, message, context);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);

  // Logtail drain
  if (LOGTAIL_TOKEN) {
    logtailBuffer.push(entry);
    scheduleFlush();
  }
}

function formatDev(level, message, context) {
  const ctx = Object.keys(context).length ? " " + JSON.stringify(context) : "";
  return `[${level.toUpperCase()}] ${message}${ctx}`;
}

export const log = {
  info: (msg, ctx) => emit("info", msg, ctx),
  warn: (msg, ctx) => emit("warn", msg, ctx),
  error: (msg, ctx) => emit("error", msg, ctx),
};

// ─── REQUEST ID MIDDLEWARE ───

export function requestId() {
  return async (c, next) => {
    const id = c.req.header("x-request-id") || randomUUID();
    c.set("requestId", id);
    c.header("X-Request-Id", id);
    await next();
  };
}

// ─── REQUEST LOGGER MIDDLEWARE ───

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
      method: c.req.method,
      route: c.req.path,
    });
  };
}

// ─── FLUSH ON SHUTDOWN ───

export async function flushLogs() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushLogtail();
}
