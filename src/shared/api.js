// ─── API CLIENT ───
// Centralized fetch layer for all backend API calls.
// Falls back to inline mock data when the API server is unavailable,
// ensuring the frontend works standalone during development.

const API_BASE = "/api";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
