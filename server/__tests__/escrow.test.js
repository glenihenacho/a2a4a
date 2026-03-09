import { describe, it, expect } from "vitest";
import { calculateRefund, calculatePayout, canTransition } from "../escrow.js";

// ─── STATE MACHINE TRANSITIONS ───

describe("canTransition", () => {
  it("allows pending → locked", () => {
    expect(canTransition("pending", "locked")).toBe(true);
  });

  it("allows locked → released", () => {
    expect(canTransition("locked", "released")).toBe(true);
  });

  it("allows locked → refunded", () => {
    expect(canTransition("locked", "refunded")).toBe(true);
  });

  it("disallows pending → released", () => {
    expect(canTransition("pending", "released")).toBe(false);
  });

  it("disallows released → locked", () => {
    expect(canTransition("released", "locked")).toBe(false);
  });

  it("disallows refunded → released", () => {
    expect(canTransition("refunded", "released")).toBe(false);
  });

  it("disallows released → refunded", () => {
    expect(canTransition("released", "refunded")).toBe(false);
  });

  it("handles unknown state", () => {
    expect(canTransition("unknown", "locked")).toBe(false);
  });
});

// ─── TIERED REFUND CALCULATOR ───

describe("calculateRefund", () => {
  const amount = 10000; // $100.00

  it("zero milestones = full refund, no payout", () => {
    const result = calculateRefund(amount, 50, 0);
    expect(result.refundCents).toBe(10000);
    expect(result.agentPayoutCents).toBe(0);
    expect(result.platformFeeCents).toBe(0);
    expect(result.tier).toBe("full");
  });

  it("< 25% SLA = full refund (with milestones)", () => {
    const result = calculateRefund(amount, 20, 1);
    expect(result.refundCents).toBe(10000);
    expect(result.agentPayoutCents).toBe(1); // floor: minimum payout
    expect(result.platformFeeCents).toBe(0);
    expect(result.tier).toBe("full");
  });

  it("25-75% SLA = 50% refund", () => {
    const result = calculateRefund(amount, 50, 3);
    expect(result.refundCents).toBe(5000);
    expect(result.agentPayoutCents).toBe(4600); // 5000 - 8% fee
    expect(result.platformFeeCents).toBe(400);
    expect(result.tier).toBe("partial");
  });

  it("25% SLA boundary = partial", () => {
    const result = calculateRefund(amount, 25, 1);
    expect(result.tier).toBe("partial");
    expect(result.refundCents).toBe(5000);
  });

  it("75% SLA boundary = partial", () => {
    const result = calculateRefund(amount, 75, 5);
    expect(result.tier).toBe("partial");
  });

  it("> 75% SLA = no refund", () => {
    const result = calculateRefund(amount, 80, 5);
    expect(result.refundCents).toBe(0);
    expect(result.agentPayoutCents).toBe(9200); // 10000 - 8% fee
    expect(result.platformFeeCents).toBe(800);
    expect(result.tier).toBe("none");
  });

  it("100% SLA = no refund, full payout", () => {
    const result = calculateRefund(amount, 100, 10);
    expect(result.refundCents).toBe(0);
    expect(result.tier).toBe("none");
  });

  it("handles small amounts without going negative", () => {
    const result = calculateRefund(1, 50, 1);
    expect(result.refundCents).toBeLessThanOrEqual(1);
    expect(result.agentPayoutCents).toBeGreaterThanOrEqual(0);
    expect(result.platformFeeCents).toBeGreaterThanOrEqual(0);
  });
});

// ─── PAYOUT CALCULATOR ───

describe("calculatePayout", () => {
  it("calculates 8% platform fee", () => {
    const result = calculatePayout(10000);
    expect(result.platformFeeCents).toBe(800);
    expect(result.agentPayoutCents).toBe(9200);
  });

  it("payout + fee = total", () => {
    const result = calculatePayout(50000);
    expect(result.agentPayoutCents + result.platformFeeCents).toBe(50000);
  });

  it("handles small amounts", () => {
    const result = calculatePayout(10);
    expect(result.platformFeeCents).toBe(1); // Math.round(10 * 0.08) = 1
    expect(result.agentPayoutCents).toBe(9);
  });

  it("handles zero", () => {
    const result = calculatePayout(0);
    expect(result.platformFeeCents).toBe(0);
    expect(result.agentPayoutCents).toBe(0);
  });
});
