// ─── VERSION COMPARISON & PROMOTION ───
// Validates new capability versions against adjacent prior versions,
// same intent class, similar environment conditions.
// Promotion is based on empirical deltas, not theoretical benchmarks.

import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Compare two versions of a capability using observed outcomes.
 * Returns delta metrics and a promotion recommendation.
 */
export async function compareVersions(db, schema, fromVersionId, toVersionId, filters = {}) {
  let fromOutcomes, toOutcomes;

  if (filters.intentFamily || filters.environment) {
    // Filtered comparison: join outcomes → executions → execution_intents
    const allFrom = await db
      .select({
        outcome: schema.outcomes,
        domain: schema.executionIntents.domain,
        environment: schema.executionIntents.environment,
      })
      .from(schema.outcomes)
      .innerJoin(schema.executions, eq(schema.outcomes.executionId, schema.executions.id))
      .innerJoin(schema.executionIntents, eq(schema.executions.intentId, schema.executionIntents.id))
      .where(eq(schema.outcomes.versionId, fromVersionId))
      .orderBy(desc(schema.outcomes.createdAt))
      .limit(100);

    const allTo = await db
      .select({
        outcome: schema.outcomes,
        domain: schema.executionIntents.domain,
        environment: schema.executionIntents.environment,
      })
      .from(schema.outcomes)
      .innerJoin(schema.executions, eq(schema.outcomes.executionId, schema.executions.id))
      .innerJoin(schema.executionIntents, eq(schema.executions.intentId, schema.executionIntents.id))
      .where(eq(schema.outcomes.versionId, toVersionId))
      .orderBy(desc(schema.outcomes.createdAt))
      .limit(100);

    const filterFn = (row) => {
      if (filters.intentFamily && row.domain !== filters.intentFamily) return false;
      if (filters.environment && row.environment !== filters.environment) return false;
      return true;
    };

    fromOutcomes = allFrom.filter(filterFn).map((r) => r.outcome).slice(0, 50);
    toOutcomes = allTo.filter(filterFn).map((r) => r.outcome).slice(0, 50);
  } else {
    [fromOutcomes, toOutcomes] = await Promise.all([
      db
        .select()
        .from(schema.outcomes)
        .where(eq(schema.outcomes.versionId, fromVersionId))
        .orderBy(desc(schema.outcomes.createdAt))
        .limit(50),
      db
        .select()
        .from(schema.outcomes)
        .where(eq(schema.outcomes.versionId, toVersionId))
        .orderBy(desc(schema.outcomes.createdAt))
        .limit(50),
    ]);
  }

  if (fromOutcomes.length === 0 || toOutcomes.length === 0) {
    return {
      fromVersionId,
      toVersionId,
      sampleSize: 0,
      recommendation: "hold",
      reason: "Insufficient data for comparison",
    };
  }

  // Compute metrics for each version
  const fromMetrics = computeVersionMetrics(fromOutcomes);
  const toMetrics = computeVersionMetrics(toOutcomes);

  // Compute deltas
  const costDelta = toMetrics.avgCost - fromMetrics.avgCost;
  const latencyDelta = toMetrics.avgLatency - fromMetrics.avgLatency;
  const qualityDelta = toMetrics.successRate - fromMetrics.successRate;
  const repairRateDelta = toMetrics.repairRate - fromMetrics.repairRate;

  // Determine recommendation
  const recommendation = determineRecommendation({
    qualityDelta,
    costDelta,
    latencyDelta,
    repairRateDelta,
    toSampleSize: toOutcomes.length,
  });

  return {
    fromVersionId,
    toVersionId,
    sampleSize: Math.min(fromOutcomes.length, toOutcomes.length),
    fromMetrics,
    toMetrics,
    deltas: { costDelta, latencyDelta, qualityDelta, repairRateDelta },
    recommendation: recommendation.action,
    reason: recommendation.reason,
    confidence: recommendation.confidence,
    intentFamily: filters.intentFamily || null,
    environment: filters.environment || null,
  };
}

function computeVersionMetrics(outcomes) {
  const total = outcomes.length;
  const successes = outcomes.filter((o) => o.verdict === "success").length;
  const repairs = outcomes.filter((o) => o.repairTriggered).length;
  const withQuality = outcomes.filter((o) => o.qualityScore != null);
  const withCost = outcomes.filter((o) => o.costDeltaCents != null);
  const withLatency = outcomes.filter((o) => o.latencyDeltaMs != null);

  return {
    total,
    successRate: total > 0 ? (successes / total) * 100 : 0,
    repairRate: total > 0 ? (repairs / total) * 100 : 0,
    avgQuality: withQuality.length > 0
      ? withQuality.reduce((sum, o) => sum + o.qualityScore, 0) / withQuality.length
      : 0,
    avgCost: withCost.length > 0
      ? withCost.reduce((sum, o) => sum + Math.abs(o.costDeltaCents), 0) / withCost.length
      : 0,
    avgLatency: withLatency.length > 0
      ? withLatency.reduce((sum, o) => sum + Math.abs(o.latencyDeltaMs), 0) / withLatency.length
      : 0,
  };
}

function determineRecommendation({ qualityDelta, costDelta, latencyDelta, repairRateDelta, toSampleSize }) {
  // Need minimum sample size for confidence
  if (toSampleSize < 10) {
    return { action: "hold", reason: "Insufficient sample size (need ≥10 runs)", confidence: 0.2 };
  }

  const confidence = Math.min(1, toSampleSize / 50);

  // Quality regression is a hard blocker
  if (qualityDelta < -5) {
    return {
      action: "demote",
      reason: `Quality regression: ${qualityDelta.toFixed(1)}% success rate drop`,
      confidence,
    };
  }

  // Significant repair rate increase
  if (repairRateDelta > 10) {
    return {
      action: "demote",
      reason: `Repair rate increased by ${repairRateDelta.toFixed(1)}%`,
      confidence,
    };
  }

  // Clear improvement: better quality, no cost/latency regression
  if (qualityDelta > 3 && costDelta <= 0 && latencyDelta <= 0) {
    return {
      action: "promote",
      reason: `Quality improved ${qualityDelta.toFixed(1)}% with no cost/latency regression`,
      confidence,
    };
  }

  // Quality improvement outweighs minor cost/latency increase
  if (qualityDelta > 5 && costDelta < 20 && latencyDelta < 100) {
    return {
      action: "promote",
      reason: `Quality improved ${qualityDelta.toFixed(1)}% (minor cost/latency trade-off acceptable)`,
      confidence,
    };
  }

  // Cost/latency improvement with no quality drop
  if (qualityDelta >= 0 && (costDelta < -10 || latencyDelta < -50)) {
    return {
      action: "promote",
      reason: `Cost/latency improved with stable quality`,
      confidence,
    };
  }

  return { action: "hold", reason: "No clear advantage over current version", confidence };
}

/**
 * Record a version comparison edge.
 */
export async function recordVersionEdge(db, schema, comparison) {
  const [edge] = await db
    .insert(schema.versionEdges)
    .values({
      fromVersionId: comparison.fromVersionId,
      toVersionId: comparison.toVersionId,
      costDelta: comparison.deltas?.costDelta || null,
      latencyDelta: comparison.deltas?.latencyDelta || null,
      qualityDelta: comparison.deltas?.qualityDelta || null,
      repairRateDelta: comparison.deltas?.repairRateDelta || null,
      rollbackIncidence: null,
      sampleSize: comparison.sampleSize || 0,
      intentFamily: comparison.intentFamily || null,
      comparedAt: new Date(),
      promotionRecommendation: comparison.recommendation || null,
    })
    .returning();
  return edge;
}

/**
 * Promote a version: set deploy status to "promoted", demote the current promoted version.
 */
export async function promoteVersion(db, schema, capabilityId, versionId) {
  // Demote current promoted version
  const current = await db
    .select()
    .from(schema.capabilityVersions)
    .where(
      and(
        eq(schema.capabilityVersions.capabilityId, capabilityId),
        eq(schema.capabilityVersions.deployStatus, "promoted"),
      ),
    );

  for (const v of current) {
    await db
      .update(schema.capabilityVersions)
      .set({ deployStatus: "demoted", demotedAt: new Date() })
      .where(eq(schema.capabilityVersions.id, v.id));
  }

  // Promote new version
  const [promoted] = await db
    .update(schema.capabilityVersions)
    .set({ deployStatus: "promoted", promotedAt: new Date() })
    .where(eq(schema.capabilityVersions.id, versionId))
    .returning();

  return promoted;
}

/**
 * Rollback: demote current version, re-promote the previous version.
 */
export async function rollbackVersion(db, schema, capabilityId, toVersionId) {
  // Find and demote current
  const current = await db
    .select()
    .from(schema.capabilityVersions)
    .where(
      and(
        eq(schema.capabilityVersions.capabilityId, capabilityId),
        eq(schema.capabilityVersions.deployStatus, "promoted"),
      ),
    );

  for (const v of current) {
    await db
      .update(schema.capabilityVersions)
      .set({ deployStatus: "rolled_back", demotedAt: new Date() })
      .where(eq(schema.capabilityVersions.id, v.id));
  }

  // Re-promote target
  const [rolledBack] = await db
    .update(schema.capabilityVersions)
    .set({ deployStatus: "promoted", promotedAt: new Date() })
    .where(eq(schema.capabilityVersions.id, toVersionId))
    .returning();

  return rolledBack;
}

/**
 * Get version lineage for a capability — all versions with edges.
 */
export async function getVersionLineage(db, schema, capabilityId) {
  const versions = await db
    .select()
    .from(schema.capabilityVersions)
    .where(eq(schema.capabilityVersions.capabilityId, capabilityId))
    .orderBy(desc(schema.capabilityVersions.createdAt));

  if (versions.length === 0) return { versions: [], edges: [] };

  const versionIds = versions.map((v) => v.id);

  const edges = await db
    .select()
    .from(schema.versionEdges)
    .where(inArray(schema.versionEdges.fromVersionId, versionIds));

  return { versions, edges };
}
