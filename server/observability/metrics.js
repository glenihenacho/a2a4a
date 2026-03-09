// ─── PROMETHEUS METRICS ───
// Runtime metrics for Grafana Cloud scraping.
// Exposes /metrics endpoint in Prometheus text format.
//
// This is separate from /api/metrics (business dashboard data).

import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register, prefix: "ap_" });

// ─── HTTP METRICS ───

export const httpRequestDuration = new Histogram({
  name: "ap_http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: "ap_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const http5xxTotal = new Counter({
  name: "ap_http_5xx_total",
  help: "Total HTTP 5xx responses",
  labelNames: ["method", "route"],
  registers: [register],
});

// ─── STRIPE METRICS ───

export const stripeWebhookTotal = new Counter({
  name: "ap_stripe_webhook_total",
  help: "Total Stripe webhooks received",
  labelNames: ["event_type"],
  registers: [register],
});

export const stripeWebhookFailures = new Counter({
  name: "ap_stripe_webhook_failures_total",
  help: "Total Stripe webhook verification failures",
  registers: [register],
});

// ─── JOB METRICS ───

export const jobRunsTotal = new Counter({
  name: "ap_job_runs_total",
  help: "Total jobs created",
  labelNames: ["vertical", "status"],
  registers: [register],
});

// ─── ESCROW METRICS ───

export const escrowLockedTotal = new Counter({
  name: "ap_escrow_locked_total",
  help: "Total escrow locks",
  registers: [register],
});

export const escrowReleasedTotal = new Counter({
  name: "ap_escrow_released_total",
  help: "Total escrow releases",
  registers: [register],
});

export const escrowRefundedTotal = new Counter({
  name: "ap_escrow_refunded_total",
  help: "Total escrow refunds",
  labelNames: ["tier"],
  registers: [register],
});

// ─── MIDDLEWARE ───

export function metricsMiddleware() {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    const route = c.req.routePath || c.req.path;
    const method = c.req.method;
    const status = String(c.res.status);

    httpRequestDuration.observe({ method, route, status }, duration);
    httpRequestsTotal.inc({ method, route, status });
    if (c.res.status >= 500) {
      http5xxTotal.inc({ method, route });
    }
  };
}

// ─── ENDPOINT HANDLER ───

export async function metricsHandler(c) {
  const metrics = await register.metrics();
  return c.text(metrics, 200, { "Content-Type": register.contentType });
}
