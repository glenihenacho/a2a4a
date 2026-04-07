// ─── OUTCOME WRITEBACK ───
// Records execution outcomes and updates rolling capability metrics.
// This is mandatory — without writeback, the system is just retrieval.

import { eq, and, gte, desc, sql } from "drizzle-orm";

/**
 * Record an execution and its outcome.
 * This is the core writeback operation that feeds the adaptation loop.
 */
export async function recordExecution(db, schema, data) {
  const execId = data.id || `EXE-${Date.now().toString(36).slice(-8)}`;

  const [execution] = await db
    .insert(schema.executions)
    .values({
      id: execId,
      intentId: data.intentId,
      capabilityId: data.capabilityId,
      versionId: data.versionId || null,
      routeDecision: data.routeDecision || "execute",
      inputPayload: data.inputPayload || null,
      outputPayload: data.outputPayload || null,
      traceLog: data.traceLog || null,
      actualCostCents: data.actualCostCents || null,
      actualLatencyMs: data.actualLatencyMs || null,
      tokensUsed: data.tokensUsed || null,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      error: data.error || null,
      fallbackTriggered: data.fallbackTriggered || false,
      repairRequired: data.repairRequired || false,
      environmentMeta: data.environmentMeta || null,
    })
    .returning();

  return execution;
}

/**
 * Record an outcome judgment for a completed execution.
 */
export async function recordOutcome(db, schema, data) {
  const [outcome] = await db
    .insert(schema.outcomes)
    .values({
      executionId: data.executionId,
      capabilityId: data.capabilityId,
      versionId: data.versionId || null,
      intentId: data.intentId || null,
      verdict: data.verdict,
      qualityScore: data.qualityScore || null,
      humanApproval: data.humanApproval ?? null,
      humanFeedback: data.humanFeedback || null,
      costDeltaCents: data.costDeltaCents || null,
      latencyDeltaMs: data.latencyDeltaMs || null,
      qualityDelta: data.qualityDelta || null,
      fallbackUsed: data.fallbackUsed || false,
      repairTriggered: data.repairTriggered || false,
      dependencyChain: data.dependencyChain || null,
      environmentMeta: data.environmentMeta || null,
    })
    .returning();

  // Update rolling capability metrics
  await updateRollingMetrics(db, schema, data.capabilityId);

  // Update execution intent status
  if (data.intentId) {
    const intentStatus = data.verdict === "success" ? "completed" : "failed";
    await db
      .update(schema.executionIntents)
      .set({ status: intentStatus, resolvedAt: new Date() })
      .where(eq(schema.executionIntents.id, data.intentId))
      .catch(() => {}); // non-critical
  }

  return outcome;
}

/**
 * Update rolling metrics for a capability based on recent outcomes.
 * Computes averages over the last 100 outcomes.
 */
export async function updateRollingMetrics(db, schema, capabilityId) {
  // Fetch recent outcomes
  const recentOutcomes = await db
    .select()
    .from(schema.outcomes)
    .where(eq(schema.outcomes.capabilityId, capabilityId))
    .orderBy(desc(schema.outcomes.createdAt))
    .limit(100);

  if (recentOutcomes.length === 0) return;

  const total = recentOutcomes.length;
  const successes = recentOutcomes.filter((o) => o.verdict === "success").length;
  const successRate = (successes / total) * 100;

  // Average quality
  const withQuality = recentOutcomes.filter((o) => o.qualityScore != null);
  const avgQuality = withQuality.length > 0
    ? withQuality.reduce((sum, o) => sum + o.qualityScore, 0) / withQuality.length
    : null;

  // Get latency/cost from executions
  const recentExecs = await db
    .select()
    .from(schema.executions)
    .where(eq(schema.executions.capabilityId, capabilityId))
    .orderBy(desc(schema.executions.createdAt))
    .limit(100);

  const withLatency = recentExecs.filter((e) => e.actualLatencyMs != null);
  const avgLatencyMs = withLatency.length > 0
    ? withLatency.reduce((sum, e) => sum + e.actualLatencyMs, 0) / withLatency.length
    : 0;

  const withCost = recentExecs.filter((e) => e.actualCostCents != null);
  const avgCostCents = withCost.length > 0
    ? withCost.reduce((sum, e) => sum + e.actualCostCents, 0) / withCost.length
    : 0;

  // Write back to capability
  await db
    .update(schema.capabilities)
    .set({
      observedMetrics: {
        successRate: Math.round(successRate * 10) / 10,
        avgLatencyMs: Math.round(avgLatencyMs),
        avgCostCents: Math.round(avgCostCents),
        totalRuns: total,
        avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.capabilities.id, capabilityId));
}

/**
 * Full writeback: record execution + outcome + update metrics.
 * This is the primary API for the adaptation plane.
 */
export async function writebackOutcome(db, schema, executionData, outcomeData) {
  const execution = await recordExecution(db, schema, executionData);

  const outcome = await recordOutcome(db, schema, {
    ...outcomeData,
    executionId: execution.id,
    capabilityId: executionData.capabilityId,
    versionId: executionData.versionId,
    intentId: executionData.intentId,
  });

  return { execution, outcome };
}

/**
 * Get outcome summary for a capability — used by the intelligence plane.
 */
export async function getOutcomeSummary(db, schema, capabilityId) {
  const outcomes = await db
    .select()
    .from(schema.outcomes)
    .where(eq(schema.outcomes.capabilityId, capabilityId))
    .orderBy(desc(schema.outcomes.createdAt))
    .limit(50);

  if (outcomes.length === 0) {
    return { total: 0, success: 0, partial: 0, failure: 0, successRate: 0, avgQuality: null };
  }

  const total = outcomes.length;
  const success = outcomes.filter((o) => o.verdict === "success").length;
  const partial = outcomes.filter((o) => o.verdict === "partial").length;
  const failure = outcomes.filter((o) => ["failure", "timeout", "error"].includes(o.verdict)).length;
  const withQuality = outcomes.filter((o) => o.qualityScore != null);
  const avgQuality = withQuality.length > 0
    ? withQuality.reduce((sum, o) => sum + o.qualityScore, 0) / withQuality.length
    : null;

  // Cost/latency prediction accuracy
  const withCostDelta = outcomes.filter((o) => o.costDeltaCents != null);
  const avgCostDelta = withCostDelta.length > 0
    ? withCostDelta.reduce((sum, o) => sum + Math.abs(o.costDeltaCents), 0) / withCostDelta.length
    : null;

  return {
    total,
    success,
    partial,
    failure,
    successRate: Math.round((success / total) * 1000) / 10,
    avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
    avgCostDeltaCents: avgCostDelta ? Math.round(avgCostDelta) : null,
    humanApprovalRate: outcomes.filter((o) => o.humanApproval === true).length / total,
  };
}
