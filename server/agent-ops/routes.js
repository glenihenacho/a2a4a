import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, schema, isDbAvailable } from "../db/index.js";
import { auth } from "../auth.js";
import { requireTier, requireAgentExists } from "./middleware.js";
import {
  opAdd, opRemove, opUpdate, opReview,
  opSuggest, opOptimize,
  opTest, opShadow, opCompile,
  TIER_GATES,
} from "./operations.js";
import {
  createCustomer,
  createSubscription,
  cancelSubscription,
} from "../stripe.js";
import { audit, AuditEvent } from "../observability/audit.js";
import { agentOpsTotal, smbSubscriptionChangesTotal } from "../observability/metrics.js";

const app = new Hono();

// ─── SHARED MIDDLEWARE ───

function requireDb(c, next) {
  if (!isDbAvailable()) {
    return c.json({ error: "Database unavailable" }, 503);
  }
  return next();
}

function injectDb(c, next) {
  c.set("db", db);
  c.set("schema", schema);
  return next();
}

async function requireAuth(c, next) {
  if (!auth) return c.json({ error: "Auth unavailable" }, 503);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
}

app.use("*", requireDb, injectDb, requireAuth);

// ─── VALIDATION ───

const shadowActionSchema = z.object({
  action: z.enum(["start", "add", "remove", "list", "run"]),
  competitorAgentId: z.string().max(16).optional(),
});

const updateSchema = z.object({
  updates: z.object({}).passthrough(),
});

const testSchema = z.object({
  testPayload: z.object({}).passthrough().nullable().optional(),
});

const compileSchema = z.object({
  versionId: z.string().max(32),
});

const subscriptionSchema = z.object({
  tier: z.enum(["pro", "scale"]),
});

// ─── OPERATION ROUTES ───

async function runOp(c, operation, fn, params = {}) {
  const user = c.get("user");
  const agentId = c.req.param("agentId");
  const start = Date.now();

  try {
    const result = await fn(db, schema, { agentId, userId: user.id, ...params });
    agentOpsTotal.inc({ operation, status: "completed" });
    return c.json(result);
  } catch (err) {
    agentOpsTotal.inc({ operation, status: "failed" });
    await audit(db, schema, {
      actorType: "user",
      actorId: user.id,
      eventType: AuditEvent.AGENT_OP_FAILED,
      metadata: { operation, agentId, error: err.message },
    });
    return c.json({ error: err.message }, 400);
  }
}

app.post("/:agentId/add", requireAgentExists, (c) =>
  runOp(c, "add", opAdd),
);

app.post("/:agentId/remove", requireAgentExists, (c) =>
  runOp(c, "remove", opRemove),
);

app.post("/:agentId/update", requireAgentExists, async (c) => {
  const body = await c.req.json();
  const { updates } = updateSchema.parse(body);
  return runOp(c, "update", opUpdate, { updates });
});

app.get("/:agentId/review", requireAgentExists, (c) =>
  runOp(c, "review", opReview),
);

app.post("/:agentId/suggest", requireAgentExists, requireTier("suggest"), (c) =>
  runOp(c, "suggest", opSuggest),
);

app.post("/:agentId/optimize", requireAgentExists, requireTier("optimize"), (c) =>
  runOp(c, "optimize", opOptimize),
);

app.post("/:agentId/test", requireAgentExists, requireTier("test"), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { testPayload } = testSchema.parse(body);
  return runOp(c, "test", opTest, { testPayload });
});

app.post("/:agentId/shadow", requireAgentExists, requireTier("shadow"), async (c) => {
  const body = await c.req.json();
  const { action, competitorAgentId } = shadowActionSchema.parse(body);
  return runOp(c, "shadow", opShadow, { action, competitorAgentId });
});

app.post("/:agentId/compile", requireAgentExists, requireTier("compile"), async (c) => {
  const body = await c.req.json();
  const { versionId } = compileSchema.parse(body);
  return runOp(c, "compile", opCompile, { versionId });
});

// ─── OPERATION HISTORY ───

app.get("/:agentId/operations", requireAgentExists, async (c) => {
  const user = c.get("user");
  const agentId = c.req.param("agentId");
  const ops = await db
    .select()
    .from(schema.agentOperations)
    .where(eq(schema.agentOperations.agentId, agentId))
    .orderBy(desc(schema.agentOperations.createdAt))
    .limit(50);
  return c.json(ops);
});

// ─── SUBSCRIPTION MANAGEMENT ───

app.get("/subscription", async (c) => {
  const user = c.get("user");
  const [sub] = await db
    .select()
    .from(schema.smbSubscriptions)
    .where(eq(schema.smbSubscriptions.userId, user.id));
  return c.json(sub || { tier: "free", userId: user.id });
});

app.post("/subscription", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { tier } = subscriptionSchema.parse(body);

  const [existing] = await db
    .select()
    .from(schema.smbSubscriptions)
    .where(eq(schema.smbSubscriptions.userId, user.id));

  const customer = await createCustomer(user.email, { userId: user.id });
  const subscription = await createSubscription(customer.id, tier);

  const subData = {
    id: `sub_${Date.now().toString(36)}`,
    userId: user.id,
    tier,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customer.id,
    currentPeriodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 86400 * 1000),
  };

  let result;
  if (existing) {
    [result] = await db
      .update(schema.smbSubscriptions)
      .set(subData)
      .where(eq(schema.smbSubscriptions.userId, user.id))
      .returning();
    smbSubscriptionChangesTotal.inc({ tier, action: "upgraded" });
  } else {
    [result] = await db
      .insert(schema.smbSubscriptions)
      .values(subData)
      .returning();
    smbSubscriptionChangesTotal.inc({ tier, action: "created" });
  }

  await audit(db, schema, {
    actorType: "user",
    actorId: user.id,
    eventType: existing
      ? AuditEvent.SMB_SUBSCRIPTION_UPGRADED
      : AuditEvent.SMB_SUBSCRIPTION_CREATED,
    metadata: { tier, stripeSubscriptionId: subscription.id },
  });

  return c.json(result, existing ? 200 : 201);
});

app.delete("/subscription", async (c) => {
  const user = c.get("user");

  const [sub] = await db
    .select()
    .from(schema.smbSubscriptions)
    .where(eq(schema.smbSubscriptions.userId, user.id));

  if (!sub) return c.json({ error: "No subscription found" }, 404);

  if (sub.stripeSubscriptionId) {
    await cancelSubscription(sub.stripeSubscriptionId);
  }

  const [updated] = await db
    .update(schema.smbSubscriptions)
    .set({ canceledAt: new Date(), tier: "free" })
    .where(eq(schema.smbSubscriptions.userId, user.id))
    .returning();

  smbSubscriptionChangesTotal.inc({ tier: sub.tier, action: "canceled" });
  await audit(db, schema, {
    actorType: "user",
    actorId: user.id,
    eventType: AuditEvent.SMB_SUBSCRIPTION_CANCELED,
    metadata: { previousTier: sub.tier },
  });

  return c.json(updated);
});

// ─── TIER GATES INFO ───

app.get("/tier-gates", (c) => {
  return c.json(TIER_GATES);
});

export { app as agentOpsRoutes };
