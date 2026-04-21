// ─── API CLIENT ───
// Centralized fetch layer for all backend API calls.
// Falls back to inline mock data when the API server is unavailable,
// ensuring the frontend works standalone during development.

const API_BASE = "/api";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${path}: ${res.status}`);
  return res.json();
}

// ─── AGENTS ───

export async function fetchAgents() {
  return fetchJson("/agents");
}

export async function fetchAgent(id) {
  return fetchJson(`/agents/${id}`);
}

// ─── INTENTS ───

export async function fetchIntents() {
  return fetchJson("/intents");
}

// ─── TRANSACTIONS ───

export async function fetchTransactions() {
  return fetchJson("/transactions");
}

// ─── SIGNALS ───

export async function fetchSignals() {
  return fetchJson("/signals");
}

// ─── JOBS ───

export async function fetchJobs() {
  return fetchJson("/jobs");
}

export async function fetchJob(id) {
  return fetchJson(`/jobs/${id}`);
}

export async function createJob(data) {
  return postJson("/jobs", data);
}

// ─── ESCROW ───

export async function fetchEscrow() {
  return fetchJson("/escrow");
}

export async function fetchEscrowById(id) {
  return fetchJson(`/escrow/${id}`);
}

export async function createEscrow(data) {
  return postJson("/escrow", data);
}

export async function lockEscrowApi(id) {
  return postJson(`/escrow/${id}/lock`);
}

export async function releaseEscrowApi(id) {
  return postJson(`/escrow/${id}/release`);
}

export async function refundEscrowApi(id, data) {
  return postJson(`/escrow/${id}/refund`, data);
}

export async function previewRefund(data) {
  return postJson("/escrow/preview-refund", data);
}

export async function fetchStripeStatus() {
  return fetchJson("/stripe/status");
}

// ─── METRICS ───

export async function fetchMetrics() {
  return fetchJson("/metrics");
}

// ─── INTENT MARKET ───

export async function fetchIntentMarket() {
  return fetchJson("/intent-market");
}

// ─── INTENT CATEGORIES ───

export async function fetchIntentCategories() {
  return fetchJson("/intent-categories");
}

// ─── SLA TEMPLATES ───

export async function fetchSlaTemplates() {
  return fetchJson("/sla-templates");
}

// ─── CONFIG ───

export async function fetchWrapperSpec() {
  return fetchJson("/config/wrapper-spec");
}

export async function fetchScanPhases() {
  return fetchJson("/config/scan-phases");
}

export async function fetchPipelineStages() {
  return fetchJson("/config/pipeline-stages");
}

export async function fetchStatusCfg() {
  return fetchJson("/config/status-cfg");
}

// ─── CAPABILITIES (Memory Plane) ───

export async function fetchCapabilities(filters = {}) {
  const params = new URLSearchParams();
  if (filters.providerType) params.set("providerType", filters.providerType);
  if (filters.status) params.set("status", filters.status);
  if (filters.agentId) params.set("agentId", filters.agentId);
  const qs = params.toString();
  return fetchJson(`/capabilities${qs ? `?${qs}` : ""}`);
}

export async function fetchCapability(id) {
  return fetchJson(`/capabilities/${id}`);
}

export async function createCapability(data) {
  return postJson("/capabilities", data);
}

export async function transitionCapability(id, status) {
  return postJson(`/capabilities/${id}/transition`, { status });
}

// ─── CAPABILITY VERSIONS ───

export async function createCapabilityVersion(data) {
  return postJson("/capability-versions", data);
}

export async function fetchVersionLineage(capabilityId) {
  return fetchJson(`/capabilities/${capabilityId}/versions`);
}

export async function promoteCapabilityVersion(versionId, capabilityId) {
  return postJson(`/capability-versions/${versionId}/promote`, { capabilityId });
}

export async function rollbackCapabilityVersion(versionId, capabilityId, toVersionId) {
  return postJson(`/capability-versions/${versionId}/rollback`, { capabilityId, toVersionId });
}

export async function compareCapabilityVersions(fromVersionId, toVersionId, filters = {}) {
  return postJson("/capability-versions/compare", { fromVersionId, toVersionId, ...filters });
}

// ─── EXECUTION INTENTS (Intelligence Plane) ───

export async function createExecutionIntent(data) {
  return postJson("/execution-intents", data);
}

export async function fetchExecutionIntents() {
  return fetchJson("/execution-intents");
}

export async function fetchExecutionIntent(id) {
  return fetchJson(`/execution-intents/${id}`);
}

export async function executeIntent(id, inputPayload = null) {
  return postJson(`/execution-intents/${id}/execute`, { inputPayload });
}

// ─── SKILL INGESTION ───

export async function ingestSkill(data) {
  return postJson("/skills/ingest", data);
}

export async function ingestSkillBatch(skills) {
  return postJson("/skills/ingest-batch", { skills });
}

// ─── CAPABILITY UPSERT ───

export async function upsertCapability(data) {
  return postJson("/capabilities/upsert", data);
}

// ─── QUOTE ───

export async function previewQuoteApi(capabilityId, intent = {}) {
  return postJson("/quote/preview", { capabilityId, intent });
}

// ─── EXECUTIONS & OUTCOMES (Adaptation Plane) ───

export async function createExecution(data) {
  return postJson("/executions", data);
}

export async function fetchExecutions(capabilityId) {
  const qs = capabilityId ? `?capabilityId=${capabilityId}` : "";
  return fetchJson(`/executions${qs}`);
}

export async function createOutcome(data) {
  return postJson("/outcomes", data);
}

export async function writebackOutcome(data) {
  return postJson("/outcomes/writeback", data);
}

export async function fetchOutcomeSummary(capabilityId) {
  return fetchJson(`/outcomes/summary/${capabilityId}`);
}

// ─── ROUTING POLICIES ───

export async function fetchRoutingPolicies() {
  return fetchJson("/routing-policies");
}

export async function createRoutingPolicy(data) {
  return postJson("/routing-policies", data);
}

export async function updateRoutingPolicy(id, data) {
  const res = await fetch(`${API_BASE}/routing-policies/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API PUT /routing-policies/${id}: ${res.status}`);
  return res.json();
}

// ─── WAITLIST ───

export async function submitWaitlist(data) {
  return postJson("/waitlist", data);
}

export async function fetchWaitlistStats() {
  return fetchJson("/waitlist/stats");
}

// ─── AGENT OPERATIONS ───

export async function agentOpAdd(agentId) {
  return postJson(`/agent-ops/${agentId}/add`, {});
}

export async function agentOpRemove(agentId) {
  return postJson(`/agent-ops/${agentId}/remove`, {});
}

export async function agentOpUpdate(agentId, updates) {
  return postJson(`/agent-ops/${agentId}/update`, { updates });
}

export async function agentOpReview(agentId) {
  return fetchJson(`/agent-ops/${agentId}/review`);
}

export async function agentOpSuggest(agentId) {
  return postJson(`/agent-ops/${agentId}/suggest`, {});
}

export async function agentOpOptimize(agentId) {
  return postJson(`/agent-ops/${agentId}/optimize`, {});
}

export async function agentOpTest(agentId, testPayload = null) {
  return postJson(`/agent-ops/${agentId}/test`, { testPayload });
}

export async function agentOpShadow(agentId, action, competitorAgentId = null) {
  return postJson(`/agent-ops/${agentId}/shadow`, { action, competitorAgentId });
}

export async function agentOpCompile(agentId, versionId) {
  return postJson(`/agent-ops/${agentId}/compile`, { versionId });
}

export async function fetchAgentOperations(agentId) {
  return fetchJson(`/agent-ops/${agentId}/operations`);
}

export async function fetchSmbSubscription() {
  return fetchJson("/agent-ops/subscription");
}

export async function createSmbSubscription(tier) {
  return postJson("/agent-ops/subscription", { tier });
}

export async function cancelSmbSubscription() {
  const res = await fetch(`${API_BASE}/agent-ops/subscription`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API DELETE /agent-ops/subscription: ${res.status}`);
  return res.json();
}

export async function fetchTierGates() {
  return fetchJson("/agent-ops/tier-gates");
}

// ─── CLI PUBLISH (UI dual-path) ───

export async function publishAgent(manifest, imageUri, imageDigest, imageSizeBytes) {
  return postJson("/cli/publish", { manifest, imageUri, imageDigest, imageSizeBytes });
}
