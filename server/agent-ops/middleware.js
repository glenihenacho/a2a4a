import { eq } from "drizzle-orm";
import { TIER_GATES, TIER_HIERARCHY } from "./operations.js";

export function requireTier(operation) {
  return async (c, next) => {
    const requiredTier = TIER_GATES[operation];
    if (requiredTier === "free") return next();

    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const db = c.get("db");
    const schema = c.get("schema");

    const [sub] = await db
      .select()
      .from(schema.smbSubscriptions)
      .where(eq(schema.smbSubscriptions.userId, user.id));

    const currentTier = sub?.tier || "free";

    if (TIER_HIERARCHY[currentTier] < TIER_HIERARCHY[requiredTier]) {
      return c.json({
        error: "Subscription required",
        requiredTier,
        currentTier,
        upgradePath: requiredTier === "pro" ? "$20/month" : "$200/month",
      }, 403);
    }

    if (sub?.canceledAt || (sub?.currentPeriodEnd && sub.currentPeriodEnd < new Date())) {
      return c.json({ error: "Subscription expired", tier: currentTier }, 403);
    }

    c.set("subscription", sub);
    return next();
  };
}

export async function requireAgentExists(c, next) {
  const agentId = c.req.param("agentId");
  if (!agentId) return c.json({ error: "Missing agentId" }, 400);

  const db = c.get("db");
  const schema = c.get("schema");

  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, agentId));

  if (!agent) return c.json({ error: "Agent not found" }, 404);

  c.set("agent", agent);
  return next();
}
