// ─── STRIPE CLIENT ───
// Initializes Stripe SDK and exports payment helpers.
// When STRIPE_SECRET_KEY is not set, all operations return
// simulated responses so the app works without a real Stripe account.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const stripe = key ? new Stripe(key) : null;

export const PLATFORM_FEE_PCT = 8; // 8% clearing fee

/**
 * Returns true when Stripe is configured with a real key.
 */
export function isStripeEnabled() {
  return !!stripe;
}

// ─── PAYMENT INTENTS (SMB funds escrow) ───

export async function createPaymentIntent(amountCents, currency, metadata) {
  if (!stripe) {
    return { id: `pi_sim_${Date.now()}`, status: "succeeded", amount: amountCents, currency };
  }
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}

// ─── TRANSFERS (pay agent via Connect) ───

export async function createTransfer(amountCents, stripeAccountId, metadata) {
  if (!stripe) {
    return { id: `tr_sim_${Date.now()}`, amount: amountCents, destination: stripeAccountId };
  }
  return stripe.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: stripeAccountId,
    metadata,
  });
}

// ─── REFUNDS ───

export async function createRefund(paymentIntentId, amountCents) {
  if (!stripe) {
    return { id: `re_sim_${Date.now()}`, amount: amountCents, payment_intent: paymentIntentId };
  }
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

// ─── CONNECT (agent builder onboarding) ───

export async function createConnectAccount(email, metadata) {
  if (!stripe) {
    return { id: `acct_sim_${Date.now()}`, email };
  }
  return stripe.accounts.create({
    type: "express",
    email,
    metadata,
    capabilities: { transfers: { requested: true } },
  });
}

export async function createAccountLink(accountId, refreshUrl, returnUrl) {
  if (!stripe) {
    return { url: returnUrl };
  }
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

// ─── SUBSCRIPTIONS (SMB tier gating) ───

const TIER_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || "price_pro_2000",
  scale: process.env.STRIPE_PRICE_SCALE || "price_scale_20000",
};

export async function createCustomer(email, metadata) {
  if (!stripe) {
    return { id: `cus_sim_${Date.now()}`, email };
  }
  return stripe.customers.create({ email, metadata });
}

export async function createSubscription(customerId, tier) {
  if (!stripe) {
    return {
      id: `sub_sim_${Date.now()}`,
      customer: customerId,
      status: "active",
      items: { data: [{ price: { id: TIER_PRICE_IDS[tier] } }] },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
    };
  }
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: TIER_PRICE_IDS[tier] }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });
}

export async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    return { id: subscriptionId, status: "canceled", canceled_at: Math.floor(Date.now() / 1000) };
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function getSubscription(subscriptionId) {
  if (!stripe) {
    return { id: subscriptionId, status: "active" };
  }
  return stripe.subscriptions.retrieve(subscriptionId);
}

// ─── MPP TRANSFERS (paid from SMB subscription pool) ───

export async function createMppTransfer(amountCents, destinationAccountId, metadata) {
  if (!stripe) {
    return { id: `tr_mpp_sim_${Date.now()}`, amount: amountCents, destination: destinationAccountId };
  }
  return stripe.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: destinationAccountId,
    metadata: { ...metadata, source: "mpp" },
  });
}

// ─── WEBHOOK VERIFICATION ───

export function constructWebhookEvent(body, signature) {
  if (!stripe) return null;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("STRIPE_WEBHOOK_SECRET not set — refusing webhooks in production");
    }
    return null;
  }
  return stripe.webhooks.constructEvent(body, signature, endpointSecret);
}
