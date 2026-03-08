import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";
import { db, schema, isDbAvailable } from "./db/index.js";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
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
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

const APP_BASE_URL = process.env.APP_URL || "http://localhost:5173";

const allowedOrigins = ["http://localhost:5173", "http://localhost:3001"];
if (process.env.APP_URL) {
  allowedOrigins.push(process.env.APP_URL);
}
if (process.env.FLY_APP_NAME) {
  allowedOrigins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
}

app.use(
  "/api/*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// ─── GLOBAL ERROR HANDLER ───

app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({ error: "Validation failed", details: err.flatten().fieldErrors }, 400);
  }
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── RATE LIMITING ───
// In-memory sliding window. Keyed by IP. Resets on server restart.

const rateLimitStore = new Map();

function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    let record = rateLimitStore.get(key);
    if (!record || now - record.windowStart > windowMs) {
      record = { windowStart: now, count: 0 };
      rateLimitStore.set(key, record);
    }
    record.count++;
    if (record.count > max) {
      return c.json({ error: "Too many requests" }, 429);
    }
    return next();
  };
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now - record.windowStart > 300_000) rateLimitStore.delete(key);
  }
}, 300_000);

// ─── SAFE JSON PARSE MIDDLEWARE ───

async function parseJson(c) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// ─── ZOD SCHEMAS ───

const agentSchema = z.object({
  id: z.string().max(16),
  name: z.string().min(1).max(100),
  avatar: z.string().max(4),
  version: z.string().max(20),
  verified: z.boolean().optional(),
  status: z.enum(["evaluation", "live", "suspended"]).optional(),
  verticals: z.array(z.enum(["SEO", "AIO"])),
  description: z.string().min(1).max(2000),
  capabilities: z.array(z.object({ verb: z.string(), domain: z.string(), desc: z.string() })),
  inputSchema: z.object({ fields: z.array(z.string()), version: z.string().optional() }).passthrough(),
  outputSchema: z.object({ fields: z.array(z.string()), version: z.string().optional() }).passthrough(),
  toolRequirements: z.array(z.string()),
  sla: z.object({}).passthrough(),
  policy: z.object({}).passthrough(),
  evalClaims: z.array(z.object({}).passthrough()),
  totalRuns: z.number().int().min(0).optional(),
  successRate: z.number().min(0).max(100).optional(),
  avgRuntime: z.string().max(20),
  avgCost: z.string().max(20),
  activeContracts: z.number().int().min(0).optional(),
  reputation: z.number().int().min(0).max(100).optional(),
  monthlyRev: z.number().int().min(0).optional(),
  wins: z.number().int().min(0).optional(),
});

const intentSchema = z.object({
  id: z.string().max(16),
  business: z.string().min(1).max(100),
  vertical: z.enum(["SEO", "AIO"]),
  status: z.enum(["bidding", "engaged", "milestone", "completed"]).optional(),
  queries: z.string().min(1).max(1000),
  url: z.string().max(255),
  bids: z.number().int().min(0).optional(),
  created: z.string().max(20),
  budget: z.string().max(30),
  agent: z.string().max(100).nullable().optional(),
  milestone: z.string().max(500).nullable().optional(),
});

const jobSchema = z.object({
  intentId: z.string().max(16),
  agentId: z.string().max(16),
  vertical: z.enum(["SEO", "AIO"]),
  slaTemplateId: z.string().max(16).nullable().optional(),
  budgetCents: z.number().int().min(1),
  milestonesTotal: z.number().int().min(0).optional(),
});

const escrowCreateSchema = z.object({
  jobId: z.string().max(16),
  amountCents: z.number().int().min(1),
  currency: z.enum(["USD", "USDC"]).optional(),
});

const escrowRefundSchema = z.object({
  slaPct: z.number().min(0).max(100),
  milestonesHit: z.number().int().min(0),
});

const previewRefundSchema = z.object({
  amountCents: z.number().int().min(1),
  slaPct: z.number().min(0).max(100),
  milestonesHit: z.number().int().min(0),
});

const waitlistSchema = z.object({
  email: z.string().email().max(255),
  imageUri: z.string().max(500).optional(),
});

const connectCreateSchema = z.object({
  agentId: z.string().max(16),
  email: z.string().email(),
});

const onboardingLinkSchema = z.object({
  accountId: z.string().min(1),
  refreshUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
});

// ─── DB GUARD MIDDLEWARE ───

function requireDb(c, next) {
  if (!isDbAvailable()) {
    return c.json({ error: "Database unavailable" }, 503);
  }
  return next();
}

// ─── AUTH ROUTES ───

app.on(["POST", "GET"], "/api/auth/*", rateLimit({ windowMs: 60_000, max: 20 }), (c) => {
  if (!auth) return c.json({ error: "Auth unavailable — no database" }, 503);
  return auth.handler(c.req.raw);
});

// ─── AUTH MIDDLEWARE ───

async function getSession(c) {
  if (!auth) return null;
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

// Middleware: require specific role
function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return next();
  };
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

app.get("/api/agents", requireDb, async (c) => {
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

app.get("/api/agents/:id", requireDb, async (c) => {
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

app.post("/api/agents", requireAuth, requireRole("builder"), requireDb, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const validated = agentSchema.parse(body);
  const user = c.get("user");
  const [inserted] = await db.insert(schema.agents).values({ ...validated, createdBy: user.id }).returning();
  return c.json(inserted, 201);
});

// ─── INTENTS ───

app.get("/api/intents", requireDb, async (c) => {
  const rows = await db.select().from(schema.intents);
  return c.json(rows);
});

app.get("/api/intents/:id", requireDb, async (c) => {
  const { id } = c.req.param();
  const [row] = await db
    .select()
    .from(schema.intents)
    .where(eq(schema.intents.id, id));
  if (!row) return c.json({ error: "Intent not found" }, 404);
  return c.json(row);
});

app.post("/api/intents", requireAuth, requireRole("smb"), requireDb, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const validated = intentSchema.parse(body);
  const user = c.get("user");
  const [inserted] = await db.insert(schema.intents).values({ ...validated, userId: user.id }).returning();
  return c.json(inserted, 201);
});

// ─── TRANSACTIONS ───

app.get("/api/transactions", requireDb, async (c) => {
  const rows = await db.select().from(schema.transactions);
  return c.json(rows);
});

// ─── SIGNALS (Live Auction Feed) ───

app.get("/api/signals", requireDb, async (c) => {
  const rows = await db.select().from(schema.signals);
  return c.json(rows);
});

// ─── JOBS ───

app.get("/api/jobs", requireDb, async (c) => {
  const rows = await db.select().from(schema.jobs);
  return c.json(rows);
});

app.get("/api/jobs/:id", requireDb, async (c) => {
  const { id } = c.req.param();
  const [row] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
  if (!row) return c.json({ error: "Job not found" }, 404);
  return c.json(row);
});

app.post("/api/jobs", requireAuth, requireDb, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const validated = jobSchema.parse(body);

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, validated.agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Verify intent exists
  const [intent] = await db.select().from(schema.intents).where(eq(schema.intents.id, validated.intentId));
  if (!intent) return c.json({ error: "Intent not found" }, 404);

  const user = c.get("user");
  const id = `JOB-${String(Date.now()).slice(-6)}`;
  const [inserted] = await db
    .insert(schema.jobs)
    .values({ id, ...validated, userId: user.id })
    .returning();
  return c.json(inserted, 201);
});

// ─── ESCROW ───

app.get("/api/escrow", requireDb, async (c) => {
  const rows = await db.select().from(schema.escrow);
  return c.json(rows);
});

app.get("/api/escrow/:id", requireDb, async (c) => {
  const { id } = c.req.param();
  const [row] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, id));
  if (!row) return c.json({ error: "Escrow not found" }, 404);
  return c.json(row);
});

// Create escrow + Stripe PaymentIntent for a job
app.post("/api/escrow", requireAuth, requireDb, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const { jobId, amountCents, currency } = escrowCreateSchema.parse(body);

  // Verify job exists and belongs to user
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
  if (!job) return c.json({ error: "Job not found" }, 404);
  const user = c.get("user");
  if (job.userId && job.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

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
app.post("/api/escrow/:id/lock", requireAuth, requireDb, async (c) => {
  try {
    const escrowId = c.req.param("id");

    // Verify ownership: user must own the job behind this escrow
    const [esc] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
    if (!esc) return c.json({ error: "Escrow not found" }, 404);
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, esc.jobId));
    const user = c.get("user");
    if (job?.userId && job.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const updated = await lockEscrow(db, schema, escrowId);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Release escrow: locked → released (SLA verified)
app.post("/api/escrow/:id/release", requireAuth, requireDb, async (c) => {
  try {
    const escrowId = c.req.param("id");

    // Verify ownership
    const [esc] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
    if (!esc) return c.json({ error: "Escrow not found" }, 404);
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, esc.jobId));
    const user = c.get("user");
    if (job?.userId && job.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const escrowRow = await releaseEscrow(db, schema, escrowId);

    // Look up agent for Stripe transfer
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
app.post("/api/escrow/:id/refund", requireAuth, requireDb, async (c) => {
  try {
    const escrowId = c.req.param("id");

    // Verify ownership
    const [esc] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
    if (!esc) return c.json({ error: "Escrow not found" }, 404);
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, esc.jobId));
    const user = c.get("user");
    if (job?.userId && job.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const body = await parseJson(c);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);
    const { slaPct, milestonesHit } = escrowRefundSchema.parse(body);

    const escrowRow = await refundEscrow(db, schema, escrowId, slaPct, milestonesHit);

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
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const { amountCents, slaPct, milestonesHit } = previewRefundSchema.parse(body);
  return c.json(calculateRefund(amountCents, slaPct, milestonesHit));
});

// ─── STRIPE CONNECT (agent builder onboarding) ───

app.post("/api/connect/create-account", requireAuth, requireRole("builder"), requireDb, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const { agentId, email } = connectCreateSchema.parse(body);

  // Verify agent exists and belongs to this builder
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  const user = c.get("user");
  if (agent.createdBy && agent.createdBy !== user.id) return c.json({ error: "Forbidden" }, 403);

  const account = await createConnectAccount(email, { agentId });
  await db.update(schema.agents).set({ stripeAccountId: account.id }).where(eq(schema.agents.id, agentId));
  return c.json({ accountId: account.id });
});

app.post("/api/connect/onboarding-link", requireAuth, async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const { accountId, refreshUrl, returnUrl } = onboardingLinkSchema.parse(body);
  const link = await createAccountLink(
    accountId,
    refreshUrl || `${APP_BASE_URL}/dashboard`,
    returnUrl || `${APP_BASE_URL}/dashboard`,
  );
  return c.json({ url: link.url });
});

// ─── STRIPE WEBHOOKS ───

app.post("/api/webhooks/stripe", requireDb, async (c) => {
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

app.get("/api/metrics", requireDb, async (c) => {
  const revenue = await db.select().from(schema.revenueMonths);
  return c.json({
    revenue,
    perf: PERF_METRICS,
    verticalSplit: VERTICAL_SPLIT,
    trendingUp: TRENDING_UP,
  });
});

// ─── INTENT MARKET ───

app.get("/api/intent-market", requireDb, async (c) => {
  const rows = await db.select().from(schema.intentMarket);
  return c.json(rows);
});

// ─── INTENT CATEGORIES ───

app.get("/api/intent-categories", requireDb, async (c) => {
  const rows = await db.select().from(schema.intentCategories);
  return c.json(rows);
});

// ─── SLA TEMPLATES ───

app.get("/api/sla-templates", requireDb, async (c) => {
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

// ─── WAITLIST ───

const FOUNDING_TOTAL = 50;

app.get("/api/waitlist/stats", async (c) => {
  if (!isDbAvailable()) return c.json({ total: FOUNDING_TOTAL, taken: 23, remaining: 27 });
  const [{ value: taken }] = await db.select({ value: count() }).from(schema.waitlist);
  return c.json({ total: FOUNDING_TOTAL, taken, remaining: FOUNDING_TOTAL - taken });
});

app.post("/api/waitlist", rateLimit({ windowMs: 60_000, max: 5 }), async (c) => {
  if (!isDbAvailable()) return c.json({ error: "Database unavailable" }, 503);
  const body = await parseJson(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const { email, imageUri } = waitlistSchema.parse(body);

  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate
  const existing = await db
    .select()
    .from(schema.waitlist)
    .where(eq(schema.waitlist.email, normalizedEmail));
  if (existing.length > 0) {
    return c.json({ error: "This email is already on the waitlist" }, 409);
  }

  // Check capacity
  const [{ value: taken }] = await db.select({ value: count() }).from(schema.waitlist);
  if (taken >= FOUNDING_TOTAL) {
    return c.json({ error: "All founding slots have been claimed" }, 410);
  }

  const id = `wl-${String(taken + 1).padStart(3, "0")}`;
  const [entry] = await db
    .insert(schema.waitlist)
    .values({
      id,
      email: normalizedEmail,
      imageUri: imageUri || null,
      slotNumber: taken + 1,
    })
    .returning();
  return c.json({ success: true, slotNumber: entry.slotNumber, remaining: FOUNDING_TOTAL - entry.slotNumber }, 201);
});

// ─── HEALTH ───

app.get("/api/health", (c) =>
  c.json({ status: "ok", db: isDbAvailable(), timestamp: new Date().toISOString() }),
);

// ─── STATIC FILES (production) ───
// Serve the Vite-built frontend from /dist when it exists.

const distPath = resolve(__dirname, "../dist");
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: "./dist" }));

  // SPA fallback — serve index.html for any non-API, non-file route
  const indexHtml = readFileSync(resolve(distPath, "index.html"), "utf-8");
  app.get("*", (c) => c.html(indexHtml));
}

// ─── START SERVER ───

const port = parseInt(process.env.PORT || "3001", 10);

const hostname = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`Hono API server running on http://${hostname}:${port}`);
  console.log(`Database: ${isDbAvailable() ? "connected" : "unavailable (frontend will use fallback data)"}`);
});

export default app;
