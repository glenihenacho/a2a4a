import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";
import { auth } from "./auth.js";
import {
  isStripeEnabled,
  createPaymentIntent,
  createTransfer,
  createRefund,
  createConnectAccount,
  createAccountLink,
  constructWebhookEvent,
  PLATFORM_FEE_PCT,
} from "./stripe.js";
import { lockEscrow, releaseEscrow, refundEscrow, calculateRefund } from "./escrow.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"],
    credentials: true,
  }),
);

// ─── AUTH ROUTES ───

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ─── AUTH MIDDLEWARE ───

async function getSession(c) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session;
}

// Middleware: require authenticated session for write operations
async function requireAuth(c, next) {
  const session = await getSession(c);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
}

// ─── AUTH-AWARE ROUTES ───

app.get("/api/me", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ user: null });
  return c.json({ user: session.user });
});

// ─── STATIC DATA (not in DB — computed/config) ───

const PERF_METRICS = {
  all: { milestoneSuccess: 68, clientRetention: 72, disputeRate: 4.2, avgTimeToEngage: "2.1d", avgBidsPerIntent: 3.4, engagementRate: 31 },
  SEO: { milestoneSuccess: 74, clientRetention: 78, disputeRate: 3.1, avgTimeToEngage: "1.8d", avgBidsPerIntent: 3.8, engagementRate: 35 },
  AIO: { milestoneSuccess: 61, clientRetention: 64, disputeRate: 5.8, avgTimeToEngage: "2.6d", avgBidsPerIntent: 2.9, engagementRate: 26 },
};

const VERTICAL_SPLIT = { seo: 55, aio: 45 };

const TRENDING_UP = [
  { query: "AI writing tool buried by competitor overviews", delta: "+273%", vol: "112K" },
  { query: "energy company wants AI overview citations", delta: "+143%", vol: "97K" },
  { query: "SaaS startup needs to rank for CRM searches", delta: "+98%", vol: "89K" },
  { query: "my skincare brand doesn't show in AI answers", delta: "+139%", vol: "74K" },
  { query: "solar installer needs AI overview placement", delta: "+136%", vol: "52K" },
];

const WRAPPER_SPEC = {
  input: [
    { field: "intent", type: "IntentSpec", desc: "Target query, vertical, goals, success criteria" },
    { field: "constraints", type: "Constraints", desc: "Budget cap, time limit, geo scope, compliance rules" },
    { field: "context_pack", type: "ContextPack", desc: "Prior artifacts, competitor data, account history" },
    { field: "allowed_tools", type: "ToolRef[]", desc: "Allowlisted tool IDs the agent may invoke" },
    { field: "budget", type: "BudgetEnvelope", desc: "Hard ceiling with per-tool sub-allocations" },
  ],
  output: [
    { field: "artifacts[]", type: "Artifact[]", desc: "Reports, code, content, schema deployments" },
    { field: "metrics", type: "RunMetrics", desc: "Latency, cost breakdown, quality signals" },
    { field: "receipts[]", type: "Receipt[]", desc: "Cryptographic proof of each tool invocation" },
    { field: "status", type: "RunStatus", desc: "completed | failed | checkpoint | cancelled" },
    { field: "traces", type: "TraceLog", desc: "Deterministic trace for replay and audit" },
  ],
  responsibilities: [
    { label: "Format Translation", desc: "Marketplace job → agent-native format", icon: "⟐" },
    { label: "Budget Enforcement", desc: "Hard caps on spend + per-tool sub-limits", icon: "◈" },
    { label: "Tool Allowlist", desc: "Proxy layer restricting tool access", icon: "⊡" },
    { label: "Structured Telemetry", desc: "Real-time events for monitoring & billing", icon: "◉" },
    { label: "Checkpointing", desc: "Deterministic resume points for retry", icon: "⊞" },
    { label: "Artifact Schema", desc: "Outputs conform to standard RunResult", icon: "⬡" },
  ],
};

const SCAN_PHASES = [
  { id: "pull", label: "Pulling image" },
  { id: "inspect", label: "Inspecting container" },
  { id: "manifest", label: "Parsing manifest" },
  { id: "capabilities", label: "Discovering capabilities" },
  { id: "schemas", label: "Inferring I/O schemas" },
  { id: "tools", label: "Detecting tool dependencies" },
  { id: "sla", label: "Benchmarking SLA" },
  { id: "policy", label: "Policy compliance scan" },
  { id: "eval", label: "Extracting eval claims" },
  { id: "wrap", label: "Wrapping agent" },
];

const PIPELINE_STAGES = [
  { label: "Image Pulled", desc: "Container downloaded and verified" },
  { label: "Manifest Inferred", desc: "Capabilities, schemas, tools auto-discovered" },
  { label: "Wrapper Integrated", desc: "Sandbox provisioned, telemetry connected" },
  { label: "Sandbox Testing", desc: "Test JobSpecs validate end-to-end I/O" },
  { label: "Evaluation Run", desc: "Benchmark jobs verify claimed metrics" },
  { label: "Review & Approval", desc: "Compliance, telemetry, threshold checks" },
  { label: "Live on Marketplace", desc: "Published, routable, monitored" },
];

const STATUS_CFG = {
  bidding: { label: "Bidding", color: "#FFA726", bg: "rgba(255,167,38,.1)" },
  engaged: { label: "Engaged", color: "#42A5F5", bg: "rgba(66,165,245,.1)" },
  milestone: { label: "In Progress", color: "#64B5F6", bg: "rgba(100,181,246,.1)" },
  completed: { label: "Completed", color: "#78909C", bg: "rgba(120,144,156,.1)" },
};

// ─── AGENTS ───

app.get("/api/agents", async (c) => {
  const rows = await db.select().from(schema.agents);
  // Reshape to match frontend MOCK_AGENTS format
  const agents = rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    version: r.version,
    verified: r.verified,
    signedAt: r.signedAt ? r.signedAt.toISOString() : null,
    status: r.status,
    verticals: r.verticals,
    description: r.description,
    capabilities: r.capabilities,
    inputSchema: r.inputSchema,
    outputSchema: r.outputSchema,
    toolRequirements: r.toolRequirements,
    sla: r.sla,
    policy: r.policy,
    evalClaims: r.evalClaims,
    stats: {
      totalRuns: r.totalRuns,
      successRate: r.successRate,
      avgRuntime: r.avgRuntime,
      avgCost: r.avgCost,
      activeContracts: r.activeContracts,
      reputation: r.reputation,
    },
    monthlyRev: r.monthlyRev,
    wins: r.wins,
  }));
  return c.json(agents);
});

app.get("/api/agents/:id", async (c) => {
  const { id } = c.req.param();
  const [row] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, id));
  if (!row) return c.json({ error: "Agent not found" }, 404);
  return c.json({
    ...row,
    signedAt: row.signedAt ? row.signedAt.toISOString() : null,
    stats: {
      totalRuns: row.totalRuns,
      successRate: row.successRate,
      avgRuntime: row.avgRuntime,
      avgCost: row.avgCost,
      activeContracts: row.activeContracts,
      reputation: row.reputation,
    },
  });
});

app.post("/api/agents", requireAuth, async (c) => {
  const body = await c.req.json();
  const [inserted] = await db.insert(schema.agents).values(body).returning();
  return c.json(inserted, 201);
});

// ─── INTENTS ───

app.get("/api/intents", async (c) => {
  const rows = await db.select().from(schema.intents);
  return c.json(rows);
});

app.get("/api/intents/:id", async (c) => {
  const { id } = c.req.param();
  const [row] = await db
    .select()
    .from(schema.intents)
    .where(eq(schema.intents.id, id));
  if (!row) return c.json({ error: "Intent not found" }, 404);
  return c.json(row);
});

app.post("/api/intents", requireAuth, async (c) => {
  const body = await c.req.json();
  const [inserted] = await db.insert(schema.intents).values(body).returning();
  return c.json(inserted, 201);
});

// ─── TRANSACTIONS ───

app.get("/api/transactions", async (c) => {
  const rows = await db.select().from(schema.transactions);
  return c.json(rows);
});

// ─── SIGNALS (Live Auction Feed) ───

app.get("/api/signals", async (c) => {
  const rows = await db.select().from(schema.signals);
  return c.json(rows);
});

// ─── JOBS ───

app.get("/api/jobs", async (c) => {
  const rows = await db.select().from(schema.jobs);
  return c.json(rows);
});

app.get("/api/jobs/:id", async (c) => {
  const { id } = c.req.param();
  const [row] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
  if (!row) return c.json({ error: "Job not found" }, 404);
  return c.json(row);
});

app.post("/api/jobs", async (c) => {
  const body = await c.req.json();
  const id = `JOB-${String(Date.now()).slice(-6)}`;
  const [inserted] = await db
    .insert(schema.jobs)
    .values({ id, ...body })
    .returning();
  return c.json(inserted, 201);
});

// ─── ESCROW ───

app.get("/api/escrow", async (c) => {
  const rows = await db.select().from(schema.escrow);
  return c.json(rows);
});

app.get("/api/escrow/:id", async (c) => {
  const { id } = c.req.param();
  const [row] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, id));
  if (!row) return c.json({ error: "Escrow not found" }, 404);
  return c.json(row);
});

// Create escrow + Stripe PaymentIntent for a job
app.post("/api/escrow", async (c) => {
  const { jobId, amountCents, currency } = await c.req.json();
  if (!jobId || !amountCents) {
    return c.json({ error: "jobId and amountCents are required" }, 400);
  }

  // Verify job exists
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
  if (!job) return c.json({ error: "Job not found" }, 404);

  // Create Stripe PaymentIntent (simulated if no key)
  const pi = await createPaymentIntent(amountCents, currency || "USD", {
    jobId,
    agentId: job.agentId,
    intentId: job.intentId,
  });

  const id = `ESC-${String(Date.now()).slice(-6)}`;
  const [inserted] = await db
    .insert(schema.escrow)
    .values({
      id,
      jobId,
      amountCents,
      currency: currency || "USD",
      stripePaymentIntentId: pi.id,
    })
    .returning();
  return c.json({ escrow: inserted, paymentIntent: { id: pi.id, status: pi.status } }, 201);
});

// Lock escrow: pending → locked (after payment confirmation)
app.post("/api/escrow/:id/lock", async (c) => {
  try {
    const updated = await lockEscrow(db, schema, c.req.param("id"));
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Release escrow: locked → released (SLA verified)
app.post("/api/escrow/:id/release", async (c) => {
  try {
    const escrowRow = await releaseEscrow(db, schema, c.req.param("id"));

    // Look up job + agent for Stripe transfer
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, escrowRow.jobId));
    if (job) {
      const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, job.agentId));
      if (agent?.stripeAccountId) {
        const transfer = await createTransfer(escrowRow.agentPayoutCents, agent.stripeAccountId, {
          escrowId: escrowRow.id,
          jobId: job.id,
        });
        await db
          .update(schema.escrow)
          .set({ stripeTransferId: transfer.id })
          .where(eq(schema.escrow.id, escrowRow.id));
      }
    }

    return c.json(escrowRow);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Refund escrow: locked → refunded (SLA miss, tiered)
app.post("/api/escrow/:id/refund", async (c) => {
  try {
    const { slaPct, milestonesHit } = await c.req.json();
    if (slaPct === undefined || milestonesHit === undefined) {
      return c.json({ error: "slaPct and milestonesHit are required" }, 400);
    }
    const escrowRow = await refundEscrow(db, schema, c.req.param("id"), slaPct, milestonesHit);

    // Process Stripe refund if payment intent exists and refund amount > 0
    if (escrowRow.stripePaymentIntentId && escrowRow.refundAmountCents > 0) {
      const refund = await createRefund(escrowRow.stripePaymentIntentId, escrowRow.refundAmountCents);
      await db
        .update(schema.escrow)
        .set({ stripeRefundId: refund.id })
        .where(eq(schema.escrow.id, escrowRow.id));
    }

    return c.json(escrowRow);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Preview refund calculation without executing
app.post("/api/escrow/preview-refund", async (c) => {
  const { amountCents, slaPct, milestonesHit } = await c.req.json();
  if (amountCents === undefined || slaPct === undefined || milestonesHit === undefined) {
    return c.json({ error: "amountCents, slaPct, and milestonesHit are required" }, 400);
  }
  return c.json(calculateRefund(amountCents, slaPct, milestonesHit));
});

// ─── STRIPE CONNECT (agent builder onboarding) ───

app.post("/api/connect/create-account", async (c) => {
  const { agentId, email } = await c.req.json();
  if (!agentId || !email) {
    return c.json({ error: "agentId and email are required" }, 400);
  }
  const account = await createConnectAccount(email, { agentId });
  await db.update(schema.agents).set({ stripeAccountId: account.id }).where(eq(schema.agents.id, agentId));
  return c.json({ accountId: account.id });
});

app.post("/api/connect/onboarding-link", async (c) => {
  const { accountId, refreshUrl, returnUrl } = await c.req.json();
  if (!accountId) return c.json({ error: "accountId is required" }, 400);
  const link = await createAccountLink(
    accountId,
    refreshUrl || "http://localhost:5173/dashboard",
    returnUrl || "http://localhost:5173/dashboard",
  );
  return c.json({ url: link.url });
});

// ─── STRIPE WEBHOOKS ───

app.post("/api/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  const body = await c.req.text();

  const event = constructWebhookEvent(body, signature);
  if (!event) {
    // No Stripe configured or invalid signature — acknowledge anyway in dev
    return c.json({ received: true, mode: "simulated" });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      // Find escrow by payment intent ID and lock it
      const [esc] = await db
        .select()
        .from(schema.escrow)
        .where(eq(schema.escrow.stripePaymentIntentId, pi.id));
      if (esc && esc.state === "pending") {
        await lockEscrow(db, schema, esc.id);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      // Log failure — escrow stays pending, SMB can retry
      const pi = event.data.object;
      console.warn(`Payment failed for PI ${pi.id}: ${pi.last_payment_error?.message}`);
      break;
    }
  }

  return c.json({ received: true });
});

// ─── STRIPE STATUS ───

app.get("/api/stripe/status", (c) => {
  return c.json({
    enabled: isStripeEnabled(),
    platformFeePct: PLATFORM_FEE_PCT,
  });
});

// ─── METRICS ───

app.get("/api/metrics", async (c) => {
  const revenue = await db.select().from(schema.revenueMonths);
  return c.json({
    revenue,
    perf: PERF_METRICS,
    verticalSplit: VERTICAL_SPLIT,
    trendingUp: TRENDING_UP,
  });
});

// ─── INTENT MARKET ───

app.get("/api/intent-market", async (c) => {
  const rows = await db.select().from(schema.intentMarket);
  return c.json(rows);
});

// ─── INTENT CATEGORIES ───

app.get("/api/intent-categories", async (c) => {
  const rows = await db.select().from(schema.intentCategories);
  return c.json(rows);
});

// ─── SLA TEMPLATES ───

app.get("/api/sla-templates", async (c) => {
  const rows = await db.select().from(schema.slaTemplates);
  // Group by vertical to match frontend SLA_TEMPLATES format
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.vertical]) grouped[r.vertical] = [];
    grouped[r.vertical].push(r);
  }
  return c.json(grouped);
});

// ─── STATIC CONFIG ───

app.get("/api/config/wrapper-spec", (c) => c.json(WRAPPER_SPEC));
app.get("/api/config/scan-phases", (c) => c.json(SCAN_PHASES));
app.get("/api/config/pipeline-stages", (c) => c.json(PIPELINE_STAGES));
app.get("/api/config/status-cfg", (c) => c.json(STATUS_CFG));

// ─── HEALTH ───

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── START SERVER ───

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono API server running on http://localhost:${port}`);
});

export default app;
