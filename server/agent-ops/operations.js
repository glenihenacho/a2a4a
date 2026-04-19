import { eq, and, desc, ne } from "drizzle-orm";
import {
  upsertCapability,
  listCapabilities,
  transitionCapabilityStatus,
  createCapabilityVersion,
} from "../memory/registry.js";
import { getOutcomeSummary } from "../adaptation/writeback.js";
import { executeCapability } from "../execution/executor.js";
import { compareVersions, promoteVersion } from "../adaptation/versioning.js";
import { createMppTransfer } from "../stripe.js";

// ─── TIER GATES ───

export const TIER_GATES = {
  add: "free",
  remove: "free",
  update: "free",
  review: "free",
  suggest: "pro",
  optimize: "pro",
  test: "scale",
  shadow: "scale",
  compile: "scale",
};

export const TIER_HIERARCHY = { free: 0, pro: 1, scale: 2 };

// ─── HELPERS ───

async function recordOp(db, schema, { agentId, userId, operation, status, input, result, error, durationMs, costCents }) {
  const [row] = await db
    .insert(schema.agentOperations)
    .values({
      agentId,
      userId,
      operation,
      status: status || "completed",
      input: input || null,
      result: result || null,
      error: error || null,
      durationMs: durationMs || null,
      costCents: costCents || null,
      completedAt: status === "completed" || !status ? new Date() : null,
    })
    .returning();
  return row;
}

async function getAgent(db, schema, agentId) {
  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, agentId));
  return agent;
}

// ─── FREE TIER OPERATIONS ───

export async function opAdd(db, schema, { agentId, userId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);
  if (agent.status !== "live" && agent.status !== "evaluation") {
    throw new Error(`Agent ${agentId} is ${agent.status}, cannot add`);
  }

  const capabilityIds = [];
  const derivedDomains = new Set();
  const errors = [];
  const capabilities = agent.capabilities || [];

  for (const cap of Array.isArray(capabilities) ? capabilities : [capabilities]) {
    if (!cap) continue;
    const intentDomains = [cap.domain, ...(cap.triggers || [])].filter(Boolean);
    intentDomains.forEach((d) => derivedDomains.add(d));

    try {
      const result = await upsertCapability(db, schema, {
        name: `${agent.name}:${cap.name}`,
        sourceKey: `agent:${agentId}:${cap.name}`,
        providerType: "skill",
        agentId,
        status: "draft",
        intentDomains,
        inputSchema: cap.inputSchema || agent.inputSchema,
        outputSchema: cap.outputSchema || agent.outputSchema,
        preconditions: { requires: agent.toolRequirements || [] },
        securityScope: { policy: agent.policy },
        costModel: { avgCost: agent.avgCost },
        latencyProfile: { avgRuntime: agent.avgRuntime, sla: agent.sla },
      });
      capabilityIds.push(result.id);
    } catch (err) {
      errors.push({ capability: cap.name, error: err.message });
    }
  }

  const opResult = {
    capabilityIds,
    derivedDomains: [...derivedDomains],
    ingested: capabilityIds.length,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };

  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "add",
    status: "completed",
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}

export async function opRemove(db, schema, { agentId, userId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  await db
    .update(schema.shadowSubscriptions)
    .set({ active: false, deactivatedAt: new Date() })
    .where(
      and(
        eq(schema.shadowSubscriptions.userId, userId),
        eq(schema.shadowSubscriptions.agentId, agentId),
        eq(schema.shadowSubscriptions.active, true),
      ),
    );

  const caps = await listCapabilities(db, schema, { agentId });
  for (const cap of caps) {
    if (cap.status !== "deprecated") {
      await transitionCapabilityStatus(db, schema, cap.id, "deprecated");
    }
  }

  const opResult = { agentId, capabilitiesDeprecated: caps.length };
  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "remove",
    status: "completed",
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}

export async function opUpdate(db, schema, { agentId, userId, updates }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const caps = await listCapabilities(db, schema, { agentId });
  const upserted = [];
  for (const cap of caps) {
    const result = await upsertCapability(db, schema, {
      ...cap,
      ...(updates || {}),
    });
    upserted.push(result.id);
  }

  const opResult = { agentId, capabilitiesUpdated: upserted.length };
  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "update",
    status: "completed",
    input: updates,
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}

export async function opReview(db, schema, { agentId, userId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const caps = await listCapabilities(db, schema, { agentId });
  const summaries = [];
  for (const cap of caps) {
    const summary = await getOutcomeSummary(db, schema, cap.id);
    summaries.push({ capabilityId: cap.id, sourceKey: cap.sourceKey, ...summary });
  }

  const competitors = await db
    .select()
    .from(schema.agents)
    .where(
      and(
        ne(schema.agents.id, agentId),
        eq(schema.agents.status, "live"),
      ),
    );

  const competitorComparison = [];
  for (const comp of competitors.slice(0, 5)) {
    const compCaps = await listCapabilities(db, schema, { agentId: comp.id });
    const compSummaries = [];
    for (const cc of compCaps) {
      const s = await getOutcomeSummary(db, schema, cc.id);
      compSummaries.push({ capabilityId: cc.id, name: cc.name, ...s });
    }
    competitorComparison.push({
      agentId: comp.id,
      name: comp.name,
      capabilities: compSummaries,
    });
  }

  const opResult = { capabilities: summaries, competitorComparison };
  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "review",
    status: "completed",
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}

// ─── PRO TIER OPERATIONS ($20/mo) ───

export async function opSuggest(db, schema, { agentId, userId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const caps = await listCapabilities(db, schema, { agentId });
  const recommendations = [];

  for (const cap of caps) {
    const summary = await getOutcomeSummary(db, schema, cap.id);
    if (!summary) continue;

    if (summary.totalRuns > 0 && summary.failureCount / summary.totalRuns > 0.2) {
      recommendations.push({
        capabilityId: cap.id,
        area: "reliability",
        description: `Failure rate ${((summary.failureCount / summary.totalRuns) * 100).toFixed(1)}% exceeds 20% threshold`,
        expectedImpact: "high",
        confidence: 0.85,
      });
    }
    if (summary.avgLatencyMs && summary.avgLatencyMs > (cap.latencyProfile?.p95Ms || 5000)) {
      recommendations.push({
        capabilityId: cap.id,
        area: "latency",
        description: `Average latency ${summary.avgLatencyMs}ms exceeds p95 target`,
        expectedImpact: "medium",
        confidence: 0.75,
      });
    }
    if (summary.avgCostCents && cap.costModel?.baseCostCents && summary.avgCostCents > cap.costModel.baseCostCents * 1.5) {
      recommendations.push({
        capabilityId: cap.id,
        area: "cost",
        description: `Average cost ${summary.avgCostCents}¢ exceeds 1.5x base cost`,
        expectedImpact: "medium",
        confidence: 0.7,
      });
    }
  }

  const opResult = { recommendations, totalCapabilities: caps.length };
  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "suggest",
    status: "completed",
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}

export async function opOptimize(db, schema, { agentId, userId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const { recommendations } = await opSuggest(db, schema, { agentId, userId });
  const applied = [];

  for (const rec of recommendations) {
    const cap = (await listCapabilities(db, schema, { agentId }))
      .find((c) => c.id === rec.capabilityId);
    if (!cap) continue;

    const optimizedData = { ...cap };
    if (rec.area === "cost" && cap.costModel) {
      optimizedData.costModel = { ...cap.costModel, baseCostCents: Math.round(cap.costModel.baseCostCents * 0.9) };
    }
    if (rec.area === "latency" && cap.latencyProfile) {
      optimizedData.latencyProfile = { ...cap.latencyProfile, p95Ms: Math.round(cap.latencyProfile.p95Ms * 1.2) };
    }

    await createCapabilityVersion(db, schema, {
      capabilityId: cap.id,
      versionTag: `optimize-${Date.now()}`,
      deployStatus: "canary",
      configSnapshot: optimizedData,
      changeReason: `auto-optimize: ${rec.area}`,
    });
    applied.push({ capabilityId: cap.id, area: rec.area });
  }

  let costCents = 0;
  if (applied.length > 0 && agent.stripeAccountId) {
    const transfer = await createMppTransfer(50, agent.stripeAccountId, {
      operation: "optimize",
      agentId,
      userId,
    });
    costCents = transfer.amount;
  }

  const opResult = { applied, recommendations: recommendations.length };
  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "optimize",
    status: "completed",
    result: opResult,
    durationMs: Date.now() - start,
    costCents,
  });

  return opResult;
}

// ─── SCALE TIER OPERATIONS ($200/mo) ───

export async function opTest(db, schema, { agentId, userId, capabilityId, testPayload }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const caps = await listCapabilities(db, schema, { agentId, status: "live" });
  if (caps.length === 0) throw new Error(`No live capabilities for agent ${agentId}`);

  let cap;
  if (capabilityId) {
    cap = caps.find((c) => c.id === capabilityId);
    if (!cap) throw new Error(`Capability ${capabilityId} not found for agent ${agentId}`);
  } else if (caps.length === 1) {
    cap = caps[0];
  } else {
    throw new Error(`Agent ${agentId} has ${caps.length} capabilities — specify capabilityId`);
  }
  const sandboxVersion = await createCapabilityVersion(db, schema, {
    capabilityId: cap.id,
    versionTag: `test-${Date.now()}`,
    deployStatus: "shadow",
    configSnapshot: cap,
    changeReason: "sandbox test execution",
  });

  const execResult = await executeCapability(db, schema, {
    intentId: null,
    capabilityId: cap.id,
    versionId: sandboxVersion.id,
    routeDecision: "shadow",
    inputPayload: testPayload || { test: true },
  });

  let costCents = 0;
  if (agent.stripeAccountId) {
    const transfer = await createMppTransfer(
      execResult.actualCostCents || 100,
      agent.stripeAccountId,
      { operation: "test", agentId, userId },
    );
    costCents = transfer.amount;
  }

  const opResult = {
    sandboxVersionId: sandboxVersion.id,
    execution: {
      verdict: execResult.verdict,
      latencyMs: execResult.actualLatencyMs,
      costCents: execResult.actualCostCents,
      qualityScore: execResult.qualityScore,
    },
  };

  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "test",
    status: "completed",
    input: testPayload,
    result: opResult,
    durationMs: Date.now() - start,
    costCents,
  });

  return opResult;
}

export async function opShadow(db, schema, { agentId, userId, action, competitorAgentId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  let opResult;

  switch (action) {
    case "start": {
      const agentCaps = await listCapabilities(db, schema, { agentId });
      const agentDomains = new Set(agentCaps.flatMap((c) => c.intentDomains || []));

      const allLiveAgents = await db
        .select()
        .from(schema.agents)
        .where(
          and(
            ne(schema.agents.id, agentId),
            eq(schema.agents.status, "live"),
          ),
        );

      const scored = [];
      for (const comp of allLiveAgents) {
        const compCaps = await listCapabilities(db, schema, { agentId: comp.id });
        const compDomains = new Set(compCaps.flatMap((c) => c.intentDomains || []));
        const overlap = [...agentDomains].filter((d) => compDomains.has(d)).length;
        const avgSuccess = compCaps.length > 0
          ? compCaps.reduce((s, c) => s + (c.observedMetrics?.successRate || 0), 0) / compCaps.length
          : 0;
        scored.push({ ...comp, overlap, avgSuccess });
      }
      const competitors = scored
        .sort((a, b) => b.overlap - a.overlap || b.avgSuccess - a.avgSuccess)
        .slice(0, 3);

      const added = [];
      for (const comp of competitors) {
        const [sub] = await db
          .insert(schema.shadowSubscriptions)
          .values({
            userId,
            agentId,
            competitorAgentId: comp.id,
            addedBy: "platform",
          })
          .returning();
        added.push({ id: sub.id, competitorId: comp.id, name: comp.name });
      }

      if (competitorAgentId && !competitors.find((c) => c.id === competitorAgentId)) {
        const [sub] = await db
          .insert(schema.shadowSubscriptions)
          .values({
            userId,
            agentId,
            competitorAgentId,
            addedBy: "user",
          })
          .returning();
        added.push({ id: sub.id, competitorId: competitorAgentId, addedBy: "user" });
      }

      opResult = { action: "start", subscriptions: added };
      break;
    }

    case "add": {
      if (!competitorAgentId) throw new Error("competitorAgentId required for add");
      const comp = await getAgent(db, schema, competitorAgentId);
      if (!comp) throw new Error(`Competitor agent ${competitorAgentId} not found`);

      const [sub] = await db
        .insert(schema.shadowSubscriptions)
        .values({
          userId,
          agentId,
          competitorAgentId,
          addedBy: "user",
        })
        .returning();
      opResult = { action: "add", subscription: sub };
      break;
    }

    case "remove": {
      if (!competitorAgentId) throw new Error("competitorAgentId required for remove");
      await db
        .update(schema.shadowSubscriptions)
        .set({ active: false, deactivatedAt: new Date() })
        .where(
          and(
            eq(schema.shadowSubscriptions.userId, userId),
            eq(schema.shadowSubscriptions.agentId, agentId),
            eq(schema.shadowSubscriptions.competitorAgentId, competitorAgentId),
            eq(schema.shadowSubscriptions.active, true),
          ),
        );
      opResult = { action: "remove", competitorAgentId };
      break;
    }

    case "list": {
      const subs = await db
        .select()
        .from(schema.shadowSubscriptions)
        .where(
          and(
            eq(schema.shadowSubscriptions.userId, userId),
            eq(schema.shadowSubscriptions.agentId, agentId),
            eq(schema.shadowSubscriptions.active, true),
          ),
        );
      opResult = { action: "list", subscriptions: subs };
      break;
    }

    case "run": {
      const subs = await db
        .select()
        .from(schema.shadowSubscriptions)
        .where(
          and(
            eq(schema.shadowSubscriptions.userId, userId),
            eq(schema.shadowSubscriptions.agentId, agentId),
            eq(schema.shadowSubscriptions.active, true),
          ),
        );

      const runResults = [];
      let totalCost = 0;

      for (const sub of subs) {
        const compCaps = await listCapabilities(db, schema, {
          agentId: sub.competitorAgentId,
          status: "live",
        });
        if (compCaps.length === 0) continue;

        const compAgent = await getAgent(db, schema, sub.competitorAgentId);
        try {
          const execResult = await executeCapability(db, schema, {
            intentId: null,
            capabilityId: compCaps[0].id,
            versionId: null,
            routeDecision: "shadow",
            inputPayload: { shadowRun: true, forAgent: agentId },
          });

          if (compAgent?.stripeAccountId) {
            const transfer = await createMppTransfer(
              execResult.actualCostCents || 50,
              compAgent.stripeAccountId,
              { operation: "shadow", agentId, competitorAgentId: sub.competitorAgentId },
            );
            totalCost += transfer.amount;
          }

          await db
            .update(schema.shadowSubscriptions)
            .set({
              lastRunAt: new Date(),
              totalRuns: sub.totalRuns + 1,
              totalCostCents: sub.totalCostCents + (execResult.actualCostCents || 50),
              insights: {
                ...(sub.insights || {}),
                lastVerdict: execResult.verdict,
                lastLatencyMs: execResult.actualLatencyMs,
                lastCostCents: execResult.actualCostCents,
              },
            })
            .where(eq(schema.shadowSubscriptions.id, sub.id));

          runResults.push({
            competitorAgentId: sub.competitorAgentId,
            verdict: execResult.verdict,
            latencyMs: execResult.actualLatencyMs,
          });
        } catch (err) {
          runResults.push({
            competitorAgentId: sub.competitorAgentId,
            error: err.message,
          });
        }
      }

      opResult = { action: "run", results: runResults, totalCostCents: totalCost };
      break;
    }

    default:
      throw new Error(`Unknown shadow action: ${action}`);
  }

  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "shadow",
    status: "completed",
    input: { action, competitorAgentId },
    result: opResult,
    durationMs: Date.now() - start,
    costCents: opResult.totalCostCents || 0,
  });

  return opResult;
}

export async function opCompile(db, schema, { agentId, userId, capabilityId, versionId }) {
  const start = Date.now();
  const agent = await getAgent(db, schema, agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const caps = await listCapabilities(db, schema, { agentId });
  if (caps.length === 0) throw new Error(`No capabilities for agent ${agentId}`);

  let cap;
  if (capabilityId) {
    cap = caps.find((c) => c.id === capabilityId);
    if (!cap) throw new Error(`Capability ${capabilityId} not found for agent ${agentId}`);
  } else if (caps.length === 1) {
    cap = caps[0];
  } else {
    throw new Error(`Agent ${agentId} has ${caps.length} capabilities — specify capabilityId`);
  }

  const promoted = await promoteVersion(db, schema, cap.id, versionId);

  if (cap.status === "evaluating") {
    await transitionCapabilityStatus(db, schema, cap.id, "live");
  }

  const opResult = {
    capabilityId: cap.id,
    promotedVersionId: versionId,
    previousVersion: promoted.previousPromoted,
  };

  await recordOp(db, schema, {
    agentId,
    userId,
    operation: "compile",
    status: "completed",
    input: { versionId },
    result: opResult,
    durationMs: Date.now() - start,
  });

  return opResult;
}
