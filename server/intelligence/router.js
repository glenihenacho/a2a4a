// ─── ROUTE SELECTOR ───
// Applies policy constraints, computes expected utility, and selects
// the lowest-cost fulfillment path that satisfies quality, latency,
// and policy constraints.

import { eq, and } from "drizzle-orm";
import { executeCapability } from "../execution/executor.js";

/**
 * Default weights for expected utility scoring.
 * EU(route) = w_q * Q̂ - w_c * Ĉ - w_l * L̂ - w_r * R̂
 */
const DEFAULT_WEIGHTS = {
  quality: 0.4,
  cost: 0.25,
  latency: 0.2,
  risk: 0.15,
};

/**
 * Load applicable routing policies for the given intent.
 */
export async function loadPolicies(db, schema, intent) {
  const policies = await db
    .select()
    .from(schema.routingPolicies)
    .where(eq(schema.routingPolicies.active, true));

  // Filter to policies whose scope matches the intent
  return policies.filter((p) => {
    const scope = p.scope || {};
    if (scope.domains && scope.domains.length > 0) {
      if (intent.domain && !scope.domains.includes(intent.domain)) return false;
    }
    if (scope.environments && scope.environments.length > 0) {
      if (intent.environment && !scope.environments.includes(intent.environment)) return false;
    }
    if (scope.privacyLevels && scope.privacyLevels.length > 0) {
      if (intent.privacyLevel && !scope.privacyLevels.includes(intent.privacyLevel)) return false;
    }
    return true;
  });
}

/**
 * Merge rules from multiple policies (most restrictive wins).
 */
function mergeRules(policies) {
  const merged = {
    qualityMin: 0,
    latencyMaxMs: Infinity,
    budgetCeilingCents: Infinity,
    allowExternal: true,
    allowShadow: true,
    minUtilityForExecution: 0.1,
    shadowThresholdRuns: 10,
    fallbackRiskThreshold: 0.3,
  };

  for (const p of policies) {
    const r = p.rules || {};
    if (r.qualityMin != null) merged.qualityMin = Math.max(merged.qualityMin, r.qualityMin);
    if (r.latencyMaxMs != null) merged.latencyMaxMs = Math.min(merged.latencyMaxMs, r.latencyMaxMs);
    if (r.budgetCeilingCents != null) merged.budgetCeilingCents = Math.min(merged.budgetCeilingCents, r.budgetCeilingCents);
    if (r.allowExternal === false) merged.allowExternal = false;
    if (r.allowShadow === false) merged.allowShadow = false;
    if (r.minUtilityForExecution != null) merged.minUtilityForExecution = Math.max(merged.minUtilityForExecution, r.minUtilityForExecution);
    if (r.shadowThresholdRuns != null) merged.shadowThresholdRuns = Math.max(merged.shadowThresholdRuns, r.shadowThresholdRuns);
    if (r.fallbackRiskThreshold != null) merged.fallbackRiskThreshold = Math.min(merged.fallbackRiskThreshold, r.fallbackRiskThreshold);
  }

  return merged;
}

/**
 * Merge weights from policies (average across all that define them).
 */
function mergeWeights(policies) {
  const withWeights = policies.filter((p) => p.weights);
  if (withWeights.length === 0) return { ...DEFAULT_WEIGHTS };

  const merged = { quality: 0, cost: 0, latency: 0, risk: 0 };
  for (const p of withWeights) {
    merged.quality += p.weights.quality || DEFAULT_WEIGHTS.quality;
    merged.cost += p.weights.cost || DEFAULT_WEIGHTS.cost;
    merged.latency += p.weights.latency || DEFAULT_WEIGHTS.latency;
    merged.risk += p.weights.risk || DEFAULT_WEIGHTS.risk;
  }
  const n = withWeights.length;
  merged.quality /= n;
  merged.cost /= n;
  merged.latency /= n;
  merged.risk /= n;

  return merged;
}

/**
 * Apply hard policy filters to candidates.
 * Returns { passed: [...], rejected: [...] } with policy violation reasons.
 */
export function applyPolicyFilters(candidates, rules, intent) {
  const passed = [];
  const rejected = [];

  // Intent constraints override policy rules (use tighter bound)
  const qualityMin = Math.max(rules.qualityMin, intent.qualityThreshold || 0);
  const latencyMax = Math.min(
    rules.latencyMaxMs,
    intent.latencyBoundMs || Infinity,
  );
  const budgetMax = Math.min(
    rules.budgetCeilingCents,
    intent.budgetBoundCents || Infinity,
  );

  for (const c of candidates) {
    const violations = [];

    // Quality gate
    if (c.quotedQuality != null && c.quotedQuality < qualityMin) {
      violations.push(`quality ${c.quotedQuality.toFixed(1)} < min ${qualityMin}`);
    }

    // Latency gate
    if (c.quotedLatencyMs != null && c.quotedLatencyMs > latencyMax) {
      violations.push(`latency ${c.quotedLatencyMs}ms > max ${latencyMax}ms`);
    }

    // Budget gate
    if (c.quotedCostCents != null && c.quotedCostCents > budgetMax) {
      violations.push(`cost ${c.quotedCostCents}¢ > budget ${budgetMax}¢`);
    }

    // Policy risk gate
    if (c.quotedPolicyRisk != null && c.quotedPolicyRisk > 0.5) {
      violations.push(`policy risk ${(c.quotedPolicyRisk * 100).toFixed(0)}% > 50%`);
    }

    if (violations.length > 0) {
      rejected.push({ ...c, policyViolations: violations, decision: "reject" });
    } else {
      passed.push(c);
    }
  }

  return { passed, rejected };
}

/**
 * Compute expected utility score for a candidate.
 * Higher is better.
 */
export function computeExpectedUtility(candidate, weights, maxCost, maxLatency) {
  const w = weights;

  // Normalize to 0-1 range
  const qualityNorm = (candidate.quotedQuality || 0) / 100;
  const costNorm = maxCost > 0 ? Math.min((candidate.quotedCostCents || 0) / maxCost, 1) : 0;
  const latencyNorm = maxLatency > 0 ? Math.min((candidate.quotedLatencyMs || 0) / maxLatency, 1) : 0;
  const riskNorm = candidate.quotedFailureRisk || 0;

  return (
    w.quality * qualityNorm -
    w.cost * costNorm -
    w.latency * latencyNorm -
    w.risk * riskNorm
  );
}

/**
 * Full routing pipeline:
 * 1. Load applicable policies
 * 2. Apply hard filters
 * 3. Score remaining candidates by expected utility
 * 4. Select best route
 *
 * Returns { selected, alternatives, rejected, policies, rules, weights }
 */
export async function selectRoute(db, schema, candidates, intent) {
  const policies = await loadPolicies(db, schema, intent);
  const rules = mergeRules(policies);
  const weights = mergeWeights(policies);

  const { passed, rejected } = applyPolicyFilters(candidates, rules, intent);

  if (passed.length === 0) {
    return {
      selected: null,
      alternatives: [],
      rejected,
      policies,
      rules,
      weights,
      decision: "reject",
      reason: "No candidates pass policy constraints",
    };
  }

  const maxCost = Math.max(...passed.map((c) => c.quotedCostCents || 0), 1);
  const maxLatency = Math.max(...passed.map((c) => c.quotedLatencyMs || 0), 1);

  const scored = passed.map((c) => ({
    ...c,
    routeScore: computeExpectedUtility(c, weights, maxCost, maxLatency),
    decision: "execute",
  }));
  scored.sort((a, b) => b.routeScore - a.routeScore);

  // Escalate: no candidate meets minimum utility threshold
  if (scored[0].routeScore < rules.minUtilityForExecution) {
    return {
      selected: null,
      alternatives: scored,
      rejected,
      policies,
      rules,
      weights,
      decision: "escalate",
      reason: `Best score ${scored[0].routeScore.toFixed(3)} below minimum ${rules.minUtilityForExecution}`,
    };
  }

  const best = scored[0];
  const rest = scored.slice(1);
  let decision = "execute";
  let shadowExecution = null;
  let fallbackRoute = null;

  // Shadow: best candidate has few historical runs — run it as shadow, use second-best as primary
  const bestMetrics = best.observedMetrics || {};
  const totalRuns = bestMetrics.totalRuns || 0;
  if (totalRuns < rules.shadowThresholdRuns && rest.length > 0 && rules.allowShadow) {
    decision = "shadow";
    shadowExecution = { ...best, decision: "shadow" };
    const primary = rest[0];
    return {
      selected: { ...primary, decision: "execute" },
      shadowExecution,
      alternatives: rest.slice(1),
      rejected,
      policies,
      rules,
      weights,
      decision: "shadow",
      reason: `Primary candidate has only ${totalRuns} runs (threshold: ${rules.shadowThresholdRuns}), shadowing with fallback`,
    };
  }

  // Fallback: best candidate has high failure risk — mark fallback, use second-best if available
  const failureRisk = best.quotedFailureRisk || 0;
  if (failureRisk > rules.fallbackRiskThreshold && rest.length > 0) {
    decision = "fallback";
    fallbackRoute = { ...best, decision: "fallback" };
    const primary = rest[0];
    return {
      selected: { ...primary, decision: "execute" },
      fallbackRoute,
      alternatives: rest.slice(1),
      rejected,
      policies,
      rules,
      weights,
      decision: "fallback",
      reason: `Top candidate failure risk ${(failureRisk * 100).toFixed(0)}% exceeds threshold ${(rules.fallbackRiskThreshold * 100).toFixed(0)}%`,
    };
  }

  return {
    selected: { ...best, decision: "execute" },
    alternatives: rest,
    rejected,
    policies,
    rules,
    weights,
    decision: "execute",
  };
}

/**
 * Create an execution intent, run retrieval + quoting + routing,
 * and return the full decision.
 */
export async function routeIntent(db, schema, intentData, retrieveFn, quoteFn, options = {}) {
  const intentId = `INT-${Date.now().toString(36).slice(-8)}`;
  const [intent] = await db
    .insert(schema.executionIntents)
    .values({
      id: intentId,
      parentIntentId: intentData.parentIntentId || null,
      goal: intentData.goal,
      domain: intentData.domain || null,
      constraints: intentData.constraints || null,
      qualityThreshold: intentData.qualityThreshold || null,
      latencyBoundMs: intentData.latencyBoundMs || null,
      budgetBoundCents: intentData.budgetBoundCents || null,
      privacyLevel: intentData.privacyLevel || null,
      environment: intentData.environment || null,
      requiredScope: intentData.requiredScope || null,
      inputFeatures: intentData.inputFeatures || null,
      status: "routing",
      userId: intentData.userId || null,
      sourceIntentId: intentData.sourceIntentId || null,
    })
    .returning();

  const candidates = await retrieveFn(db, schema, intent);
  const quoted = await quoteFn(db, schema, candidates, intent);
  const result = await selectRoute(db, schema, quoted, intent);

  const newStatus = result.selected ? "executing" : "failed";
  await db
    .update(schema.executionIntents)
    .set({
      status: newStatus,
      selectedRouteId: result.selected?.id || null,
      resolvedAt: result.selected ? new Date() : null,
    })
    .where(eq(schema.executionIntents.id, intentId));

  const routeResult = { intent, ...result };

  if (options.execute && result.selected) {
    const execResult = await executeCapability(db, schema, {
      intentId: intent.id,
      capabilityId: result.selected.id,
      versionId: result.selected.versionId || null,
      routeDecision: result.selected.decision || "execute",
      inputPayload: intentData.inputPayload || null,
    });
    routeResult.execution = execResult;
  }

  return routeResult;
}
