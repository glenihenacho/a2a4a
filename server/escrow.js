// ─── ESCROW STATE MACHINE + TIERED REFUND LOGIC ───
//
// State transitions:
//   pending  → locked     (SMB approves cost, payment confirmed)
//   locked   → released   (job completes, SLA verified)
//   locked   → refunded   (SLA miss, tiered refund applied)
//
// Tiered refund formula (from CLAUDE.md):
//   < 25% of SLA target  → full refund to SMB
//   25–75% of SLA target → 50% refund to SMB
//   > 75% of SLA target  → no refund (agent keeps 100%)
//
// Floor rule: zero milestones hit = no payout at all.
// Once ≥1 milestone hit, agent keeps a minimum payout.

import { eq } from "drizzle-orm";
import { PLATFORM_FEE_PCT } from "./stripe.js";

// ─── VALID STATE TRANSITIONS ───

const VALID_TRANSITIONS = {
  pending: ["locked"],
  locked: ["released", "refunded"],
  released: [],
  refunded: [],
};

export function canTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

// ─── TIERED REFUND CALCULATOR ───

/**
 * Calculate refund amounts based on SLA achievement.
 *
 * @param {number} amountCents     Total escrow amount in cents
 * @param {number} slaPct          SLA achievement percentage (0–100)
 * @param {number} milestonesHit   Number of milestones delivered
 * @returns {{ refundCents, agentPayoutCents, platformFeeCents, tier }}
 */
export function calculateRefund(amountCents, slaPct, milestonesHit) {
  // Zero milestones = total failure → full refund, no payout
  if (milestonesHit === 0) {
    return {
      refundCents: amountCents,
      agentPayoutCents: 0,
      platformFeeCents: 0,
      tier: "full",
    };
  }

  let refundPct;
  let tier;

  if (slaPct < 25) {
    refundPct = 100;
    tier = "full";
  } else if (slaPct <= 75) {
    refundPct = 50;
    tier = "partial";
  } else {
    refundPct = 0;
    tier = "none";
  }

  const refundCents = Math.round((amountCents * refundPct) / 100);
  const remaining = amountCents - refundCents;
  const platformFeeCents = Math.round((remaining * PLATFORM_FEE_PCT) / 100);
  const agentPayoutCents = remaining - platformFeeCents;

  // Floor: once any milestone is hit, agent gets minimum payout
  // (at least 1 cent or whatever remains after platform fee)
  const minPayout = milestonesHit > 0 && agentPayoutCents === 0 ? 1 : agentPayoutCents;

  return {
    refundCents,
    agentPayoutCents: minPayout,
    platformFeeCents,
    tier,
  };
}

/**
 * Calculate payout for a fully successful job (SLA pass, no refund).
 *
 * @param {number} amountCents  Total escrow amount in cents
 * @returns {{ agentPayoutCents, platformFeeCents }}
 */
export function calculatePayout(amountCents) {
  const platformFeeCents = Math.round((amountCents * PLATFORM_FEE_PCT) / 100);
  const agentPayoutCents = amountCents - platformFeeCents;
  return { agentPayoutCents, platformFeeCents };
}

// ─── STATE MACHINE OPERATIONS ───

/**
 * Lock escrow: pending → locked.
 * Called after Stripe PaymentIntent succeeds.
 */
export async function lockEscrow(db, schema, escrowId) {
  const [row] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
  if (!row) throw new Error(`Escrow ${escrowId} not found`);
  if (!canTransition(row.state, "locked")) {
    throw new Error(`Cannot lock escrow in state "${row.state}"`);
  }
  const [updated] = await db
    .update(schema.escrow)
    .set({ state: "locked", lockedAt: new Date() })
    .where(eq(schema.escrow.id, escrowId))
    .returning();
  return updated;
}

/**
 * Release escrow: locked → released.
 * Called when job completes and SLA is verified.
 */
export async function releaseEscrow(db, schema, escrowId) {
  const [row] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
  if (!row) throw new Error(`Escrow ${escrowId} not found`);
  if (!canTransition(row.state, "released")) {
    throw new Error(`Cannot release escrow in state "${row.state}"`);
  }

  const { agentPayoutCents, platformFeeCents } = calculatePayout(row.amountCents);

  const [updated] = await db
    .update(schema.escrow)
    .set({
      state: "released",
      agentPayoutCents,
      platformFeeCents,
      releasedAt: new Date(),
    })
    .where(eq(schema.escrow.id, escrowId))
    .returning();
  return updated;
}

/**
 * Refund escrow: locked → refunded.
 * Called when SLA verification fails.
 */
export async function refundEscrow(db, schema, escrowId, slaPct, milestonesHit) {
  const [row] = await db.select().from(schema.escrow).where(eq(schema.escrow.id, escrowId));
  if (!row) throw new Error(`Escrow ${escrowId} not found`);
  if (!canTransition(row.state, "refunded")) {
    throw new Error(`Cannot refund escrow in state "${row.state}"`);
  }

  const { refundCents, agentPayoutCents, platformFeeCents, tier } = calculateRefund(
    row.amountCents,
    slaPct,
    milestonesHit,
  );

  const [updated] = await db
    .update(schema.escrow)
    .set({
      state: "refunded",
      refundAmountCents: refundCents,
      agentPayoutCents,
      platformFeeCents,
      refundTier: tier,
      refundedAt: new Date(),
    })
    .where(eq(schema.escrow.id, escrowId))
    .returning();
  return updated;
}
