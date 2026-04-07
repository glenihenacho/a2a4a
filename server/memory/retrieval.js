// ─── RETRIEVAL STACK ───
// Stage 1: Binary quantization — coarse candidate pruning
// Stage 2: Semantic reranking — higher-fidelity ordering
// Stage 3: Policy filtering — final action selection (delegated to router)

import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Stage 1: Coarse retrieval via domain matching and status filtering.
 * In production this would use binary quantized embeddings for ANN search.
 * For MVP, uses domain overlap + status + provider type filtering.
 */
export async function coarseRetrieve(db, schema, intent, opts = {}) {
  const limit = opts.limit || 20;

  // Fetch all live capabilities
  let candidates = await db
    .select()
    .from(schema.capabilities)
    .where(eq(schema.capabilities.status, "live"));

  // Domain matching: score by overlap between intent domain and capability domains
  const intentDomain = intent.domain?.toLowerCase() || "";
  const intentGoal = intent.goal?.toLowerCase() || "";

  candidates = candidates.map((cap) => {
    const domains = (cap.intentDomains || []).map((d) => d.toLowerCase());
    let domainScore = 0;

    // Exact domain match
    if (intentDomain && domains.includes(intentDomain)) {
      domainScore += 1.0;
    }

    // Keyword overlap with goal
    for (const d of domains) {
      if (intentGoal.includes(d)) domainScore += 0.5;
    }

    return { ...cap, domainScore, retrievalStage: "binary" };
  });

  // Sort by domain score descending, take top N
  candidates.sort((a, b) => b.domainScore - a.domainScore);
  return candidates.slice(0, limit);
}

/**
 * Stage 2: Semantic reranking.
 * In production this would use TurboQuant or a learned reranker.
 * For MVP, uses a weighted composite of domain match, historical quality, and cost efficiency.
 */
export async function semanticRerank(db, schema, candidates, intent) {
  const budgetCents = intent.budgetBoundCents || Infinity;
  const latencyMs = intent.latencyBoundMs || Infinity;
  const qualityMin = intent.qualityThreshold || 0;

  return candidates
    .map((cap) => {
      const metrics = cap.observedMetrics || {};
      const costModel = cap.costModel || {};
      const latencyProfile = cap.latencyProfile || {};
      const qualityProfile = cap.qualityProfile || {};

      // Predicted quality: use observed success rate or baseline
      const predictedQuality =
        metrics.successRate || qualityProfile.baselineScore || qualityProfile.successRate || 50;

      // Predicted cost: use observed average or cost model
      const predictedCost =
        metrics.avgCostCents || costModel.baseCents || costModel.perCallCents || 0;

      // Predicted latency: use observed average or profile
      const predictedLatency =
        metrics.avgLatencyMs || latencyProfile.p50Ms || 0;

      // Failure risk: inverse of success rate
      const failureRisk = 1 - (predictedQuality / 100);

      // Semantic score combines domain match with performance
      const semanticScore =
        (cap.domainScore || 0) * 0.3 +
        (predictedQuality / 100) * 0.4 +
        (1 - Math.min(predictedCost / Math.max(budgetCents, 1), 1)) * 0.2 +
        (1 - Math.min(predictedLatency / Math.max(latencyMs, 1), 1)) * 0.1;

      return {
        ...cap,
        retrievalStage: "rerank",
        semanticScore,
        predictedQuality,
        predictedCost,
        predictedLatency,
        failureRisk,
      };
    })
    .sort((a, b) => b.semanticScore - a.semanticScore);
}

/**
 * Full retrieval pipeline: coarse → rerank.
 * Policy filtering happens in the router.
 */
export async function retrieveCandidates(db, schema, intent, opts = {}) {
  const coarse = await coarseRetrieve(db, schema, intent, opts);
  const reranked = await semanticRerank(db, schema, coarse, intent);
  return reranked;
}

/**
 * Store candidates as intent_candidates records for audit trail.
 */
export async function persistCandidates(db, schema, intentId, candidates) {
  if (!candidates.length) return [];

  const records = candidates.map((c, i) => ({
    intentId,
    capabilityId: c.id,
    versionId: c.versionId || null,
    retrievalStage: c.retrievalStage || "rerank",
    retrievalRank: i + 1,
    semanticScore: c.semanticScore || null,
    quotedCostCents: c.quotedCostCents || c.predictedCost || null,
    quotedLatencyMs: c.quotedLatencyMs || c.predictedLatency || null,
    quotedQuality: c.quotedQuality || c.predictedQuality || null,
    quotedFailureRisk: c.quotedFailureRisk || c.failureRisk || null,
    quotedPolicyRisk: c.quotedPolicyRisk || null,
    quotedRepairCost: c.quotedRepairCost || null,
    routeScore: c.routeScore || c.semanticScore || null,
    decision: c.decision || null,
    policyViolations: c.policyViolations || null,
  }));

  return db.insert(schema.intentCandidates).values(records).returning();
}
