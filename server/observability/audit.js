// ─── AUDIT LOG ───
// Append-only Postgres audit trail for business-critical events.
// This is the system of record for auth, escrow, Stripe, and job events.

import { createHash } from "node:crypto";
import { log } from "./logger.js";

/**
 * Write an audit log entry to the database.
 * Falls back to structured logging if DB is unavailable.
 *
 * @param {object} db         Drizzle DB instance
 * @param {object} schema     Drizzle schema (must include auditLog table)
 * @param {object} entry      Audit entry fields
 * @param {string} entry.actorType    "user" | "system" | "webhook" | "agent"
 * @param {string} [entry.actorId]    User or agent ID
 * @param {string} entry.eventType    e.g. "escrow.locked", "auth.sign_in"
 * @param {string} [entry.entityType] e.g. "escrow", "job", "agent"
 * @param {string} [entry.entityId]   ID of the entity
 * @param {string} [entry.requestId]  Correlation ID from request context
 * @param {string} [entry.sessionId]  Session ID
 * @param {string} [entry.jobId]      Job ID
 * @param {string} [entry.escrowId]   Escrow ID
 * @param {string} [entry.stripeEventId] Stripe event ID
 * @param {string} [entry.severity]   "info" | "warn" | "critical"
 * @param {object} [entry.metadata]   Arbitrary JSON metadata
 * @param {string} [entry.ip]         IP address (will be hashed)
 * @param {string} [entry.userAgent]  User-Agent header
 */
export async function audit(db, schema, entry) {
  const row = {
    actorType: entry.actorType,
    actorId: entry.actorId || null,
    eventType: entry.eventType,
    entityType: entry.entityType || null,
    entityId: entry.entityId || null,
    requestId: entry.requestId || null,
    sessionId: entry.sessionId || null,
    jobId: entry.jobId || null,
    escrowId: entry.escrowId || null,
    stripeEventId: entry.stripeEventId || null,
    severity: entry.severity || "info",
    metadata: entry.metadata || null,
    ipHash: entry.ip ? hashIp(entry.ip) : null,
    userAgent: entry.userAgent ? entry.userAgent.slice(0, 500) : null,
  };

  // Always log to structured logs
  log.info(`audit: ${entry.eventType}`, {
    ...row,
    metadata: undefined, // don't double-log large metadata
  });

  // Persist to DB if available
  if (db && schema.auditLog) {
    try {
      await db.insert(schema.auditLog).values(row);
    } catch (err) {
      log.error("Failed to write audit log", {
        eventType: entry.eventType,
        error: err.message,
      });
    }
  }
}

/**
 * Hash IP for privacy — store a SHA-256 hash, not the raw IP.
 */
function hashIp(ip) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// ─── EVENT TYPE CONSTANTS ───

export const AuditEvent = {
  // Auth
  AUTH_SIGN_IN: "auth.sign_in",
  AUTH_SIGN_OUT: "auth.sign_out",
  AUTH_SIGN_UP: "auth.sign_up",

  // Jobs
  JOB_CREATED: "job.created",
  JOB_DISPATCHED: "job.dispatched",
  JOB_CHECKPOINT: "job.checkpoint",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",

  // Escrow
  ESCROW_CREATED: "escrow.created",
  ESCROW_LOCKED: "escrow.locked",
  ESCROW_RELEASED: "escrow.released",
  ESCROW_REFUNDED: "escrow.refunded",

  // Stripe
  STRIPE_WEBHOOK_RECEIVED: "stripe.webhook.received",
  STRIPE_WEBHOOK_VALIDATED: "stripe.webhook.validated",
  STRIPE_PAYMENT_FAILED: "stripe.payment.failed",

  // SLA
  SLA_VERDICT_RECORDED: "sla.verdict.recorded",
};
