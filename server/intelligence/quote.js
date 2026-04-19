// ─── QUOTE ENGINE ───
// For each candidate route, estimates cost, latency, quality, failure risk,
// policy risk, and downstream repair cost. Uses historical metrics when
// available, falls back to capability profiles.

import { eq, desc } from "drizzle-orm";

/**
 * Generate a quote for a single candidate capability against an intent.
 *
 * Returns: { quotedCostCents, quotedLatencyMs, quotedQuality, quotedFailureRisk,
 *            quotedPolicyRisk, quotedRepairCost, confidence }
 */
export async function generateQuote(db, schema, capability, intent) {
  const metrics = capability.observedMetrics || {};
  const costModel = capability.costModel || {};
  const latencyProfile = capability.latencyProfile || {};
  const qualityProfile = capability.qualityProfile || {};

  // ─── Historical data lookup ───
  // Pull recent metrics windows for this capability to improve estimates
  let recentMetrics = [];
  try {
    recentMetrics = await db
      .select()
      .from(schema.capabilityMetrics)
      .where(eq(schema.capabilityMetrics.capabilityId, capability.id))
      .orderBy(desc(schema.capabilityMetrics.windowEnd))
      .limit(5);
  } catch {
    // Metrics table may be empty — use profile data
  }

  // ─── Cost estimation ───
  let quotedCostCents;
  if (recentMetrics.length > 0) {
    // Weighted average of recent windows (more recent = higher weight)
    const totalWeight = recentMetrics.reduce((sum, _, i) => sum + (recentMetrics.length - i), 0);
    quotedCostCents = Math.round(
      recentMetrics.reduce(
        (sum, m, i) => sum + (m.avgCostCents || 0) * (recentMetrics.length - i),
        0,
      ) / totalWeight,
    );
  } else {
    quotedCostCents = metrics.avgCostCents || costModel.baseCents || costModel.perCallCents || 0;
  }

  if (capability.agentId) {
    try {
      const [agent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, capability.agentId));
      if (agent?.sla?.maxCost) {
        const maxCostCents = parseInt(agent.sla.maxCost.replace(/[^0-9]/g, ""), 10) * 100;
        if (maxCostCents > 0 && quotedCostCents > maxCostCents) {
          quotedCostCents = maxCostCents;
        }
      }
    } catch { /* agent lookup optional */ }
  }

  // ─── Latency estimation ───
  let quotedLatencyMs;
  if (recentMetrics.length > 0) {
    const totalWeight = recentMetrics.reduce((sum, _, i) => sum + (recentMetrics.length - i), 0);
    quotedLatencyMs = Math.round(
      recentMetrics.reduce(
        (sum, m, i) => sum + (m.avgLatencyMs || 0) * (recentMetrics.length - i),
        0,
      ) / totalWeight,
    );
  } else {
    quotedLatencyMs = metrics.avgLatencyMs || latencyProfile.p50Ms || 0;
  }

  // ─── Quality estimation ───
  let quotedQuality;
  if (recentMetrics.length > 0) {
    const withQuality = recentMetrics.filter((m) => m.avgQualityScore != null);
    if (withQuality.length > 0) {
      quotedQuality = withQuality.reduce((sum, m) => sum + m.avgQualityScore, 0) / withQuality.length;
    } else {
      // Derive from success rate
      const withRuns = recentMetrics.filter((m) => m.totalRuns > 0);
      quotedQuality = withRuns.length > 0
        ? (withRuns.reduce((sum, m) => sum + m.successCount / m.totalRuns, 0) / withRuns.length) * 100
        : 50;
    }
  } else {
    quotedQuality =
      metrics.successRate || qualityProfile.baselineScore || qualityProfile.successRate || 50;
  }

  // ─── Failure risk ───
  let quotedFailureRisk;
  if (recentMetrics.length > 0) {
    const withRuns = recentMetrics.filter((m) => m.totalRuns > 0);
    quotedFailureRisk = withRuns.length > 0
      ? withRuns.reduce((sum, m) => sum + m.failureCount / m.totalRuns, 0) / withRuns.length
      : 0.5;
  } else {
    quotedFailureRisk = 1 - (quotedQuality / 100);
  }

  // ─── Policy risk ───
  // Check if capability scope aligns with intent requirements
  let quotedPolicyRisk = 0;
  const requiredScope = intent.requiredScope || [];
  const capScope = capability.securityScope || {};
  if (requiredScope.length > 0 && capScope.allowedTools) {
    const missing = requiredScope.filter((s) => !capScope.allowedTools.includes(s));
    quotedPolicyRisk = missing.length / requiredScope.length;
  }

  // ─── Repair cost estimate ───
  // Based on failure risk and average cost
  const quotedRepairCost = Math.round(quotedCostCents * quotedFailureRisk * 0.5);

  // ─── Confidence ───
  // Higher with more historical data
  const totalHistoricalRuns = recentMetrics.reduce((sum, m) => sum + (m.totalRuns || 0), 0);
  const confidence = Math.min(1, totalHistoricalRuns / 100);

  return {
    quotedCostCents,
    quotedLatencyMs,
    quotedQuality,
    quotedFailureRisk,
    quotedPolicyRisk,
    quotedRepairCost,
    confidence,
  };
}

/**
 * Generate quotes for all candidates in a batch.
 */
export async function generateQuotes(db, schema, candidates, intent) {
  const quoted = [];
  for (const cap of candidates) {
    const quote = await generateQuote(db, schema, cap, intent);
    quoted.push({ ...cap, ...quote });
  }
  return quoted;
}

/**
 * Preview a quote without persisting — useful for cost exploration.
 */
export function previewQuote(capability, _intent) {
  const metrics = capability.observedMetrics || {};
  const costModel = capability.costModel || {};
  const latencyProfile = capability.latencyProfile || {};
  const qualityProfile = capability.qualityProfile || {};

  const quotedCostCents = metrics.avgCostCents || costModel.baseCents || 0;
  const quotedLatencyMs = metrics.avgLatencyMs || latencyProfile.p50Ms || 0;
  const quotedQuality = metrics.successRate || qualityProfile.baselineScore || 50;
  const quotedFailureRisk = 1 - (quotedQuality / 100);

  return {
    quotedCostCents,
    quotedLatencyMs,
    quotedQuality,
    quotedFailureRisk,
    quotedPolicyRisk: 0,
    quotedRepairCost: Math.round(quotedCostCents * quotedFailureRisk * 0.5),
    confidence: 0, // no historical lookup
  };
}
