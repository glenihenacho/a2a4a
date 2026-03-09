// ─── SENTRY ERROR TRACKING ───
// Captures unhandled exceptions, escrow invariant violations,
// Stripe failures, and DB write errors.
//
// Set SENTRY_DSN env var to enable. Without it, this module is a no-op.

let Sentry = null;

export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.FLY_IMAGE_REF || process.env.npm_package_version,
      tracesSampleRate: 0.1, // 10% of transactions
      beforeSend(event) {
        // Strip sensitive data
        if (event.request?.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
        return event;
      },
    });
  } catch (err) {
    console.warn("Failed to initialize Sentry:", err.message);
  }
}

/**
 * Capture an exception in Sentry with request context.
 */
export function captureException(err, context = {}) {
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag("requestId", context.requestId);
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.route) scope.setTag("route", context.route);
    if (context.escrowId) scope.setTag("escrowId", context.escrowId);
    if (context.jobId) scope.setTag("jobId", context.jobId);
    if (context.stripeEventId) scope.setTag("stripeEventId", context.stripeEventId);
    scope.setExtras(context);
    Sentry.captureException(err);
  });
}

/**
 * Capture a warning message in Sentry.
 */
export function captureMessage(message, context = {}) {
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag("requestId", context.requestId);
    scope.setExtras(context);
    Sentry.captureMessage(message, "warning");
  });
}

/**
 * Flush Sentry event queue before shutdown.
 */
export async function flushSentry() {
  if (!Sentry) return;
  await Sentry.close(5000);
}

export function isSentryEnabled() {
  return Sentry !== null;
}
