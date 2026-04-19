// ─── CAPABILITY EXECUTOR ───
// Invokes skill handlers for routed capabilities and records results.
// Skills encapsulate their own interaction details (MCP, HTTP, local compute)
// — the executor doesn't need to know how a skill works internally.

import { eq } from "drizzle-orm";
import { writebackOutcome } from "../adaptation/writeback.js";

const skillHandlers = new Map();

/**
 * Register a skill handler function.
 * Handlers are invoked by name when a skill-type capability is executed.
 */
export function registerSkillHandler(name, handlerFn) {
  skillHandlers.set(name, handlerFn);
}

async function dispatch(capability, input, signal) {
  const handler = skillHandlers.get(capability.name);
  if (!handler) {
    throw new Error(`No handler registered for capability "${capability.name}"`);
  }
  return handler(input, { capability, signal });
}

/**
 * Execute a capability for a routed intent.
 *
 * Creates an execution record, invokes the skill handler,
 * records the outcome, and writes back metrics.
 */
export async function executeCapability(db, schema, {
  intentId,
  capabilityId,
  versionId,
  routeDecision,
  inputPayload,
}) {
  const [capability] = await db
    .select()
    .from(schema.capabilities)
    .where(eq(schema.capabilities.id, capabilityId));

  if (!capability) {
    throw new Error(`Capability ${capabilityId} not found`);
  }

  const [intent] = await db
    .select()
    .from(schema.executionIntents)
    .where(eq(schema.executionIntents.id, intentId));

  await db
    .update(schema.executionIntents)
    .set({
      status: "executing",
      capabilityId,
      agentId: capability.agentId || null,
    })
    .where(eq(schema.executionIntents.id, intentId));

  const startedAt = new Date();
  const timeoutMs = intent?.latencyBoundMs || 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let result;
  let error = null;

  try {
    result = await dispatch(capability, inputPayload || {}, controller.signal);
  } catch (err) {
    error = err.name === "AbortError" ? "Execution timed out" : err.message;
    result = {
      outputPayload: null,
      actualCostCents: 0,
      actualLatencyMs: Date.now() - startedAt.getTime(),
      tokensUsed: 0,
    };
  } finally {
    clearTimeout(timer);
  }

  const completedAt = new Date();
  const actualLatencyMs = result.actualLatencyMs || (completedAt - startedAt);

  const verdict = error
    ? (error === "Execution timed out" ? "timeout" : "error")
    : "success";

  const { execution, outcome } = await writebackOutcome(db, schema, {
    intentId,
    capabilityId,
    versionId: versionId || null,
    routeDecision: routeDecision || "execute",
    inputPayload,
    outputPayload: result.outputPayload,
    actualCostCents: result.actualCostCents || 0,
    actualLatencyMs: Math.round(actualLatencyMs),
    tokensUsed: result.tokensUsed || 0,
    startedAt,
    completedAt,
    error,
  }, {
    verdict,
    qualityScore: result.qualityScore || (verdict === "success" ? 80 : 0),
  });

  return {
    executionId: execution.id,
    intentId,
    capabilityId,
    verdict,
    outputPayload: result.outputPayload,
    actualCostCents: result.actualCostCents || 0,
    actualLatencyMs: Math.round(actualLatencyMs),
    tokensUsed: result.tokensUsed || 0,
    error,
  };
}
