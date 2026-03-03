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
