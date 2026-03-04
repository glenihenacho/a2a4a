import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ─── ENUMS ───

export const verticalEnum = pgEnum("vertical", ["SEO", "AIO"]);
export const agentStatusEnum = pgEnum("agent_status", [
  "evaluation",
  "live",
  "suspended",
]);
export const intentStatusEnum = pgEnum("intent_status", [
  "bidding",
  "engaged",
  "milestone",
  "completed",
]);
export const txnTypeEnum = pgEnum("txn_type", [
  "clearing",
  "milestone",
  "refund",
  "escrow_lock",
  "escrow_release",
  "cpe_bid",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "created",
  "executing",
  "completed",
  "failed",
  "cancelled",
]);
export const txnStatusEnum = pgEnum("txn_status", ["pending", "settled"]);
export const currencyEnum = pgEnum("currency", ["USDC", "USD"]);
export const signalStatusEnum = pgEnum("signal_status", [
  "live",
  "warming",
  "cooling",
]);
export const aioPosEnum = pgEnum("aio_pos", [
  "none",
  "mentioned",
  "cited",
  "featured",
]);
export const escrowStateEnum = pgEnum("escrow_state", [
  "pending",
  "locked",
  "released",
  "refunded",
]);
export const userRoleEnum = pgEnum("user_role", ["smb", "builder"]);

// ─── AUTH TABLES (Better Auth) ───

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("smb").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── TABLES ───

export const agents = pgTable("agents", {
  id: varchar("id", { length: 16 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 4 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  verified: boolean("verified").default(false).notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  status: agentStatusEnum("status").default("evaluation").notNull(),
  verticals: jsonb("verticals").notNull(), // string[]
  description: text("description").notNull(),
  capabilities: jsonb("capabilities").notNull(), // { verb, domain, desc }[]
  inputSchema: jsonb("input_schema").notNull(), // { fields, version }
  outputSchema: jsonb("output_schema").notNull(), // { fields, version }
  toolRequirements: jsonb("tool_requirements").notNull(), // string[]
  sla: jsonb("sla").notNull(), // { latencyP50, latencyP99, maxCost, retryPolicy, supportWindow, uptime }
  policy: jsonb("policy").notNull(), // { disallowed, dataRetention, sandbox }
  evalClaims: jsonb("eval_claims").notNull(), // { metric, target, achieved, pass }[]
  totalRuns: integer("total_runs").default(0).notNull(),
  successRate: real("success_rate").default(0).notNull(),
  avgRuntime: varchar("avg_runtime", { length: 20 }).notNull(),
  avgCost: varchar("avg_cost", { length: 20 }).notNull(),
  activeContracts: integer("active_contracts").default(0).notNull(),
  reputation: integer("reputation").default(0).notNull(),
  monthlyRev: integer("monthly_rev").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  stripeAccountId: varchar("stripe_account_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const intents = pgTable("intents", {
  id: varchar("id", { length: 16 }).primaryKey(),
  business: varchar("business", { length: 100 }).notNull(),
  vertical: verticalEnum("vertical").notNull(),
  status: intentStatusEnum("status").default("bidding").notNull(),
  queries: text("queries").notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  bids: integer("bids").default(0).notNull(),
  created: varchar("created", { length: 20 }).notNull(),
  budget: varchar("budget", { length: 30 }).notNull(),
  agent: varchar("agent", { length: 100 }),
  milestone: text("milestone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 16 }).primaryKey(),
  type: txnTypeEnum("type").notNull(),
  agent: varchar("agent", { length: 100 }).notNull(),
  client: varchar("client", { length: 100 }).notNull(),
  amount: integer("amount").notNull(),
  currency: currencyEnum("currency").notNull(),
  status: txnStatusEnum("status").default("pending").notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  vertical: verticalEnum("vertical").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const signals = pgTable("signals", {
  id: varchar("id", { length: 16 }).primaryKey(),
  query: text("query").notNull(),
  vertical: verticalEnum("vertical").notNull(),
  status: signalStatusEnum("status").default("live").notNull(),
  rank: integer("rank").notNull(),
  prevRank: integer("prev_rank").notNull(),
  aioPos: aioPosEnum("aio_pos").default("none").notNull(),
  avgSpend: integer("avg_spend").default(0).notNull(),
  topBid: integer("top_bid").default(0).notNull(),
  agents: integer("agents").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  ctr: real("ctr").default(0).notNull(),
  aioVisible: boolean("aio_visible").default(false).notNull(),
  lastUpdate: varchar("last_update", { length: 20 }).notNull(),
  spend7d: jsonb("spend_7d").notNull(), // number[]
  category: varchar("category", { length: 60 }).notNull(),
  signal: integer("signal").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const intentMarket = pgTable("intent_market", {
  id: integer("id").primaryKey(),
  query: text("query").notNull(),
  vol: integer("vol").notNull(),
  volTrend: jsonb("vol_trend").notNull(), // number[]
  aioRate: integer("aio_rate").notNull(),
  ctr: integer("ctr").notNull(),
  ctrDelta: integer("ctr_delta").notNull(),
  competition: integer("competition").notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  opportunity: integer("opportunity").notNull(),
  vertical: verticalEnum("vertical").notNull(),
  aioCited: integer("aio_cited").notNull(),
  avgPos: real("avg_pos").notNull(),
});

export const slaTemplates = pgTable("sla_templates", {
  id: varchar("id", { length: 16 }).primaryKey(),
  vertical: verticalEnum("vertical").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  desc: text("desc").notNull(),
  timeline: varchar("timeline", { length: 30 }).notNull(),
  metric: varchar("metric", { length: 100 }).notNull(),
});

export const revenueMonths = pgTable("revenue_months", {
  month: varchar("month", { length: 10 }).primaryKey(),
  clearing: integer("clearing").notNull(),
  milestones: integer("milestones").notNull(),
  total: integer("total").notNull(),
});

export const intentCategories = pgTable("intent_categories", {
  name: varchar("name", { length: 60 }).primaryKey(),
  count: integer("count").notNull(),
  avgAio: integer("avg_aio").notNull(),
  avgVol: integer("avg_vol").notNull(),
  color: varchar("color", { length: 10 }).notNull(),
});

// ─── JOBS ───

export const jobs = pgTable("jobs", {
  id: varchar("id", { length: 16 }).primaryKey(),
  intentId: varchar("intent_id", { length: 16 }).notNull(),
  agentId: varchar("agent_id", { length: 16 }).notNull(),
  status: jobStatusEnum("status").default("created").notNull(),
  vertical: verticalEnum("vertical").notNull(),
  slaTemplateId: varchar("sla_template_id", { length: 16 }),
  budgetCents: integer("budget_cents").notNull(),
  costActualCents: integer("cost_actual_cents"),
  milestonesTotal: integer("milestones_total").default(0).notNull(),
  milestonesHit: integer("milestones_hit").default(0).notNull(),
  slaTarget: integer("sla_target"),
  slaAchieved: integer("sla_achieved"),
  slaReport: jsonb("sla_report"),
  artifacts: jsonb("artifacts"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── ESCROW ───

export const escrow = pgTable("escrow", {
  id: varchar("id", { length: 16 }).primaryKey(),
  jobId: varchar("job_id", { length: 16 }).notNull(),
  state: escrowStateEnum("state").default("pending").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: currencyEnum("currency").default("USD").notNull(),
  platformFeeCents: integer("platform_fee_cents").default(0).notNull(),
  agentPayoutCents: integer("agent_payout_cents"),
  refundAmountCents: integer("refund_amount_cents"),
  refundTier: varchar("refund_tier", { length: 20 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 64 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 64 }),
  stripeRefundId: varchar("stripe_refund_id", { length: 64 }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
