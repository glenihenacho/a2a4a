import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.use("/api/*", cors());

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

app.post("/api/agents", async (c) => {
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

app.post("/api/intents", async (c) => {
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

// ─── ESCROW (intent-based escrow view) ───

app.get("/api/escrow", async (c) => {
  // Escrow view is derived from intents — same data, filtered by escrow-relevant statuses
  const rows = await db.select().from(schema.intents);
  return c.json(rows);
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
