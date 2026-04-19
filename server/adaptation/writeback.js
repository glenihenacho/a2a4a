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

  const withQuality = recentOutcomes.filter((o) => o.qualityScore != null);
  const avgQuality = withQuality.length > 0
    ? withQuality.reduce((sum, o) => sum + o.qualityScore, 0) / withQuality.length
    : null;

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

  // Trust score: consistency (low variance in success) + repair rate
  const repairs = recentOutcomes.filter((o) => o.repairTriggered).length;
  const repairRate = total > 0 ? repairs / total : 0;
  const windows = splitIntoWindows(recentOutcomes, 10);
  const windowRates = windows.map((w) => {
    const s = w.filter((o) => o.verdict === "success").length;
    return w.length > 0 ? s / w.length : 0;
  });
  const consistencyScore = windowRates.length > 1
    ? 1 - Math.min(1, standardDeviation(windowRates) * 2)
    : 0.5;
  const trustScore = Math.round((0.6 * consistencyScore + 0.4 * (1 - repairRate)) * 100) / 100;

  // Per-domain calibration
  const domainCalibration = {};
  const outcomesWithIntents = await db
    .select({
      verdict: schema.outcomes.verdict,
      qualityScore: schema.outcomes.qualityScore,
      costDeltaCents: schema.outcomes.costDeltaCents,
      latencyDeltaMs: schema.outcomes.latencyDeltaMs,
      domain: schema.executionIntents.domain,
    })
    .from(schema.outcomes)
    .innerJoin(schema.executions, eq(schema.outcomes.executionId, schema.executions.id))
    .innerJoin(schema.executionIntents, eq(schema.executions.intentId, schema.executionIntents.id))
    .where(eq(schema.outcomes.capabilityId, capabilityId))
    .orderBy(desc(schema.outcomes.createdAt))
    .limit(100);

  const byDomain = {};
  for (const row of outcomesWithIntents) {
    const d = row.domain || "unknown";
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(row);
  }
  for (const [domain, rows] of Object.entries(byDomain)) {
    const dSuccesses = rows.filter((r) => r.verdict === "success").length;
    domainCalibration[domain] = {
      successRate: Math.round((dSuccesses / rows.length) * 1000) / 10,
      sampleSize: rows.length,
    };
  }

  // Version promotion confidence
  const [cap] = await db
    .select()
    .from(schema.capabilities)
    .where(eq(schema.capabilities.id, capabilityId));

  let versionConfidence = null;
  if (cap) {
    const promotedVersions = await db
      .select()
      .from(schema.capabilityVersions)
      .where(
        and(
          eq(schema.capabilityVersions.capabilityId, capabilityId),
          eq(schema.capabilityVersions.deployStatus, "promoted"),
        ),
      )
      .limit(1);

    if (promotedVersions.length > 0) {
      const currentVer = promotedVersions[0];
      const verOutcomes = recentOutcomes.filter((o) => o.versionId === currentVer.id);
      const verSuccesses = verOutcomes.filter((o) => o.verdict === "success").length;
      const verRate = verOutcomes.length > 0 ? (verSuccesses / verOutcomes.length) * 100 : 0;
      const trendDirection = verRate >= successRate ? "stable_or_improving" : "declining";
      versionConfidence = {
        currentVersion: currentVer.versionTag,
        runsOnVersion: verOutcomes.length,
        successRateOnVersion: Math.round(verRate * 10) / 10,
        trendDirection,
      };
    }
  }

  // Route selection prior
  const candidateRecords = await db
    .select()
    .from(schema.intentCandidates)
    .where(eq(schema.intentCandidates.capabilityId, capabilityId))
    .orderBy(desc(schema.intentCandidates.createdAt))
    .limit(100);

  const selectedCount = candidateRecords.filter((c) => c.decision === "execute").length;
  const totalCandidateCount = candidateRecords.length;
  const ranks = candidateRecords
    .filter((c) => c.retrievalRank != null)
    .map((c) => c.retrievalRank);
  const avgRank = ranks.length > 0
    ? Math.round((ranks.reduce((s, r) => s + r, 0) / ranks.length) * 10) / 10
    : null;

  const routePrior = {
    selectedCount,
    totalCandidateCount,
    avgRank,
  };

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
        trustScore,
        domainCalibration,
        versionConfidence,
        routePrior,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.capabilities.id, capabilityId));
}

function splitIntoWindows(items, windowSize) {
  const windows = [];
  for (let i = 0; i < items.length; i += windowSize) {
    windows.push(items.slice(i, i + windowSize));
  }
  return windows;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
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
