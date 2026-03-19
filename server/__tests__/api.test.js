import { describe, it, expect } from "vitest";
import app from "../index.js";

// These tests run against the Hono app directly (no DB, no network).
// List routes return empty data without DB — demo data is only for demo accounts.

describe("API routes (no DB)", () => {
  it("GET /api/health returns degraded without DB (non-production)", async () => {
    const res = await app.request("/api/health");
    // In dev/test (NODE_ENV !== "production"), health returns 200 even without DB
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.db).toBe(false);
    expect(body.timestamp).toBeDefined();
  });

  it("GET /api/agents returns empty array without DB", async () => {
    const res = await app.request("/api/agents");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET /api/intents returns empty array without DB", async () => {
    const res = await app.request("/api/intents");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET /api/transactions returns empty array without DB", async () => {
    const res = await app.request("/api/transactions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET /api/signals returns empty array without DB", async () => {
    const res = await app.request("/api/signals");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET /api/jobs returns empty array without DB", async () => {
    const res = await app.request("/api/jobs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET /api/escrow returns empty array without DB", async () => {
    const res = await app.request("/api/escrow");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  // Static config routes should work without DB

  it("GET /api/config/wrapper-spec returns wrapper spec", async () => {
    const res = await app.request("/api/config/wrapper-spec");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.input).toBeDefined();
    expect(body.output).toBeDefined();
    expect(body.responsibilities).toBeDefined();
    expect(body.responsibilities).toHaveLength(6);
  });

  it("GET /api/config/scan-phases returns 10 phases", async () => {
    const res = await app.request("/api/config/scan-phases");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(10);
    expect(body[0].id).toBe("pull");
    expect(body[9].id).toBe("wrap");
  });

  it("GET /api/config/pipeline-stages returns 7 stages", async () => {
    const res = await app.request("/api/config/pipeline-stages");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(7);
  });

  it("GET /api/config/status-cfg returns status config", async () => {
    const res = await app.request("/api/config/status-cfg");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bidding).toBeDefined();
    expect(body.engaged).toBeDefined();
    expect(body.milestone).toBeDefined();
    expect(body.completed).toBeDefined();
  });

  it("GET /api/stripe/status returns stripe status", async () => {
    const res = await app.request("/api/stripe/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.platformFeePct).toBe(8);
  });

  it("GET /api/me returns null user without session", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("POST /api/escrow/preview-refund calculates correctly", async () => {
    const res = await app.request("/api/escrow/preview-refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: 10000, slaPct: 50, milestonesHit: 3 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe("partial");
    expect(body.refundCents).toBe(5000);
    expect(body.agentPayoutCents).toBe(4600);
    expect(body.platformFeeCents).toBe(400);
  });

  it("POST /api/escrow/preview-refund validates input", async () => {
    const res = await app.request("/api/escrow/preview-refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: -1, slaPct: 200, milestonesHit: 0 }),
    });
    expect(res.status).toBe(400);
  });

  // Auth-protected routes return 401 without session

  it("POST /api/agents returns 401 without auth", async () => {
    const res = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TestAgent" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/intents returns 401 without auth", async () => {
    const res = await app.request("/api/intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business: "Test" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/jobs returns 401 without auth", async () => {
    const res = await app.request("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: "I1", agentId: "A1" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/escrow returns 401 without auth", async () => {
    const res = await app.request("/api/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "J1", amountCents: 5000 }),
    });
    expect(res.status).toBe(401);
  });

  // Security headers

  it("responses include security headers", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  // Body size limit middleware is verified via real HTTP requests (E2E).
  // Hono's app.request() test helper does not forward Content-Length headers.

  // Waitlist stats fallback

  it("GET /api/waitlist/stats returns fallback without DB", async () => {
    const res = await app.request("/api/waitlist/stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(50);
    expect(body.remaining).toBe(27);
  });
});
