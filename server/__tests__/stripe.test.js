import { describe, it, expect, beforeEach, vi } from "vitest";

// Test the Stripe module in simulated mode (no STRIPE_SECRET_KEY set)

describe("Stripe (simulated mode)", () => {
  let stripe;

  beforeEach(async () => {
    // Clear env to force simulated mode
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    // Re-import fresh module
    vi.resetModules();
    stripe = await import("../stripe.js");
  });

  it("isStripeEnabled returns false without key", () => {
    expect(stripe.isStripeEnabled()).toBe(false);
  });

  it("PLATFORM_FEE_PCT is 8", () => {
    expect(stripe.PLATFORM_FEE_PCT).toBe(8);
  });

  it("createPaymentIntent returns simulated PI", async () => {
    const pi = await stripe.createPaymentIntent(5000, "USD", { jobId: "J1" });
    expect(pi.id).toMatch(/^pi_sim_/);
    expect(pi.status).toBe("succeeded");
    expect(pi.amount).toBe(5000);
    expect(pi.currency).toBe("USD");
  });

  it("createTransfer returns simulated transfer", async () => {
    const tr = await stripe.createTransfer(4600, "acct_123", { escrowId: "E1" });
    expect(tr.id).toMatch(/^tr_sim_/);
    expect(tr.amount).toBe(4600);
    expect(tr.destination).toBe("acct_123");
  });

  it("createRefund returns simulated refund", async () => {
    const re = await stripe.createRefund("pi_123", 2500);
    expect(re.id).toMatch(/^re_sim_/);
    expect(re.amount).toBe(2500);
    expect(re.payment_intent).toBe("pi_123");
  });

  it("createConnectAccount returns simulated account", async () => {
    const acct = await stripe.createConnectAccount("test@example.com", { agentId: "A1" });
    expect(acct.id).toMatch(/^acct_sim_/);
    expect(acct.email).toBe("test@example.com");
  });

  it("createAccountLink returns fallback URL", async () => {
    const link = await stripe.createAccountLink("acct_sim_1", "http://refresh", "http://return");
    expect(link.url).toBe("http://return");
  });

  it("constructWebhookEvent returns null without Stripe", () => {
    const result = stripe.constructWebhookEvent("body", "sig");
    expect(result).toBeNull();
  });
});

describe("Stripe webhook in production", () => {
  it("throws when STRIPE_WEBHOOK_SECRET missing in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    // Need STRIPE_SECRET_KEY set so stripe client exists
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_testing";

    vi.resetModules();
    const stripe = await import("../stripe.js");

    expect(() => stripe.constructWebhookEvent("body", "sig")).toThrow(
      "STRIPE_WEBHOOK_SECRET not set",
    );

    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.STRIPE_SECRET_KEY;
  });
});
