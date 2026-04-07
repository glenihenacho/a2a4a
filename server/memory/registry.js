// ─── CAPABILITY REGISTRY ───
// Ingests capabilities as normalized execution primitives, indexes them
// with live performance metadata, and manages version lifecycle.

import { eq, and, inArray } from "drizzle-orm";

/**
 * Generate a capability ID: CAP-<timestamp6>
 */
function genCapabilityId() {
  return `CAP-${Date.now().toString(36).slice(-8)}`;
}

function genVersionId() {
  return `VER-${Date.now().toString(36).slice(-8)}`;
}

/**
 * Ingest a new capability into the registry.
 * Normalizes the input into a canonical execution primitive.
 */
export async function ingestCapability(db, schema, data) {
  const id = data.id || genCapabilityId();
  const now = new Date();

  const record = {
    id,
    name: data.name,
    providerType: data.providerType,
    status: data.status || "draft",
    intentDomains: data.intentDomains || [],
    inputSchema: data.inputSchema || null,
    outputSchema: data.outputSchema || null,
    preconditions: data.preconditions || null,
    resourceRequirements: data.resourceRequirements || null,
    securityScope: data.securityScope || null,
    costModel: data.costModel || null,
    latencyProfile: data.latencyProfile || null,
    qualityProfile: data.qualityProfile || null,
    failureModes: data.failureModes || null,
    dependencies: data.dependencies || null,
    embedding: data.embedding || null,
    binaryCode: data.binaryCode || null,
    observedMetrics: data.observedMetrics || { successRate: 0, avgLatencyMs: 0, avgCostCents: 0, totalRuns: 0 },
    agentId: data.agentId || null,
    createdAt: now,
    updatedAt: now,
  };

  const [inserted] = await db.insert(schema.capabilities).values(record).returning();
  return inserted;
}

/**
 * Create a new version for a capability.
 */
export async function createCapabilityVersion(db, schema, data) {
  const id = data.id || genVersionId();

  const record = {
    id,
    capabilityId: data.capabilityId,
    versionTag: data.versionTag,
    deployStatus: data.deployStatus || "shadow",
    changelog: data.changelog || null,
    inputSchema: data.inputSchema || null,
    outputSchema: data.outputSchema || null,
    costModel: data.costModel || null,
    latencyProfile: data.latencyProfile || null,
    qualityProfile: data.qualityProfile || null,
    configSnapshot: data.configSnapshot || null,
    createdAt: new Date(),
  };

  const [inserted] = await db.insert(schema.capabilityVersions).values(record).returning();
  return inserted;
}

/**
 * Update a capability's observed metrics from latest execution data.
 */
export async function updateObservedMetrics(db, schema, capabilityId, metrics) {
  const [updated] = await db
    .update(schema.capabilities)
    .set({
      observedMetrics: metrics,
      updatedAt: new Date(),
    })
    .where(eq(schema.capabilities.id, capabilityId))
    .returning();
  return updated;
}

/**
 * Transition capability status.
 */
const VALID_STATUS_TRANSITIONS = {
  draft: ["evaluating"],
  evaluating: ["live", "draft"],
  live: ["deprecated", "rolled_back"],
  deprecated: ["live"],
  rolled_back: ["evaluating", "draft"],
};

export async function transitionCapabilityStatus(db, schema, capabilityId, newStatus) {
  const [cap] = await db
    .select()
    .from(schema.capabilities)
    .where(eq(schema.capabilities.id, capabilityId));

  if (!cap) throw new Error(`Capability ${capabilityId} not found`);

  const allowed = VALID_STATUS_TRANSITIONS[cap.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${cap.status} → ${newStatus}`);
  }

  const [updated] = await db
    .update(schema.capabilities)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.capabilities.id, capabilityId))
    .returning();
  return updated;
}

/**
 * List capabilities with optional filters.
 */
export async function listCapabilities(db, schema, filters = {}) {
  let query = db.select().from(schema.capabilities);

  const conditions = [];
  if (filters.providerType) {
    conditions.push(eq(schema.capabilities.providerType, filters.providerType));
  }
  if (filters.status) {
    conditions.push(eq(schema.capabilities.status, filters.status));
  }
  if (filters.agentId) {
    conditions.push(eq(schema.capabilities.agentId, filters.agentId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

/**
 * Get capability by ID with its versions.
 */
export async function getCapabilityWithVersions(db, schema, capabilityId) {
  const [cap] = await db
    .select()
    .from(schema.capabilities)
    .where(eq(schema.capabilities.id, capabilityId));

  if (!cap) return null;

  const versions = await db
    .select()
    .from(schema.capabilityVersions)
    .where(eq(schema.capabilityVersions.capabilityId, capabilityId));

  return { ...cap, versions };
}

/**
 * Record a metrics window for a capability.
 */
export async function recordMetricsWindow(db, schema, data) {
  const [inserted] = await db
    .insert(schema.capabilityMetrics)
    .values({
      capabilityId: data.capabilityId,
      versionId: data.versionId || null,
      domain: data.domain || null,
      environment: data.environment || null,
      windowStart: data.windowStart,
      windowEnd: data.windowEnd,
      totalRuns: data.totalRuns || 0,
      successCount: data.successCount || 0,
      failureCount: data.failureCount || 0,
      avgLatencyMs: data.avgLatencyMs || null,
      p50LatencyMs: data.p50LatencyMs || null,
      p95LatencyMs: data.p95LatencyMs || null,
      p99LatencyMs: data.p99LatencyMs || null,
      avgCostCents: data.avgCostCents || null,
      avgQualityScore: data.avgQualityScore || null,
      failureModeBreakdown: data.failureModeBreakdown || null,
    })
    .returning();
  return inserted;
}

/**
 * Ingest an existing marketplace agent as a capability.
 * Bridges the existing agents table to the capability registry.
 */
export async function ingestAgentAsCapability(db, schema, agentId) {
  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, agentId));

  if (!agent) throw new Error(`Agent ${agentId} not found`);

  // Map agent capabilities to intent domains
  const intentDomains = (agent.capabilities || []).map((c) => c.domain);

  const capData = {
    name: agent.name,
    providerType: "internal_agent",
    status: agent.status === "live" ? "live" : agent.status === "evaluation" ? "evaluating" : "draft",
    intentDomains,
    inputSchema: agent.inputSchema,
    outputSchema: agent.outputSchema,
    preconditions: { requires: agent.toolRequirements || [] },
    securityScope: { policy: agent.policy },
    costModel: { avgCost: agent.avgCost },
    latencyProfile: { avgRuntime: agent.avgRuntime, sla: agent.sla },
    qualityProfile: { successRate: agent.successRate, reputation: agent.reputation },
    failureModes: [],
    observedMetrics: {
      successRate: agent.successRate,
      avgLatencyMs: 0,
      avgCostCents: 0,
      totalRuns: agent.totalRuns,
    },
    agentId: agent.id,
  };

  return ingestCapability(db, schema, capData);
}
