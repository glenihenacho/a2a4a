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

// ─── ESCROW ───

export async function fetchEscrow() {
  return fetchJson("/escrow");
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
