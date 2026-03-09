import { describe, it, expect, vi } from "vitest";
import { log } from "../observability/logger.js";
import { AuditEvent, audit } from "../observability/audit.js";
import { calculateRefund } from "../escrow.js";
import app from "../index.js";

describe("Structured logger", () => {
  it("log.info outputs without throwing", () => {
    expect(() => log.info("test message", { key: "value" })).not.toThrow();
  });

  it("log.warn outputs without throwing", () => {
    expect(() => log.warn("warning", { code: 123 })).not.toThrow();
  });

  it("log.error outputs without throwing", () => {
    expect(() => log.error("error occurred", { stack: "..." })).not.toThrow();
  });
});

describe("Audit event constants", () => {
  it("defines all required event types", () => {
    expect(AuditEvent.AUTH_SIGN_IN).toBe("auth.sign_in");
    expect(AuditEvent.AUTH_SIGN_OUT).toBe("auth.sign_out");
    expect(AuditEvent.JOB_CREATED).toBe("job.created");
    expect(AuditEvent.ESCROW_CREATED).toBe("escrow.created");
    expect(AuditEvent.ESCROW_LOCKED).toBe("escrow.locked");
    expect(AuditEvent.ESCROW_RELEASED).toBe("escrow.released");
    expect(AuditEvent.ESCROW_REFUNDED).toBe("escrow.refunded");
    expect(AuditEvent.STRIPE_WEBHOOK_RECEIVED).toBe("stripe.webhook.received");
    expect(AuditEvent.STRIPE_PAYMENT_FAILED).toBe("stripe.payment.failed");
    expect(AuditEvent.SLA_VERDICT_RECORDED).toBe("sla.verdict.recorded");
  });
});

describe("Audit function", () => {
  it("falls back to log when DB is null", async () => {
    // Should not throw even without DB
    await expect(
      audit(null, {}, {
        actorType: "system",
        eventType: AuditEvent.ESCROW_LOCKED,
        entityType: "escrow",
        entityId: "ESC-001",
      }),
    ).resolves.not.toThrow();
  });

  it("falls back to log when schema has no auditLog table", async () => {
    const mockDb = {};
    await expect(
      audit(mockDb, {}, {
        actorType: "user",
        actorId: "user-1",
        eventType: AuditEvent.JOB_CREATED,
      }),
    ).resolves.not.toThrow();
  });
});

describe("Prometheus metrics endpoint", () => {
  it("GET /metrics returns Prometheus text format", async () => {
    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
    const text = await res.text();
    // Should contain default Node.js metrics
    expect(text).toContain("ap_");
    // Should contain our custom metrics
    expect(text).toContain("ap_http_requests_total");
  });
});

describe("Security headers on metrics endpoint", () => {
  it("metrics endpoint has security headers", async () => {
    const res = await app.request("/metrics");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
