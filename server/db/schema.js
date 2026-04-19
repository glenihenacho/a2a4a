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

export const providerTypeEnum = pgEnum("provider_type", [
  "skill",
]);
export const capabilityStatusEnum = pgEnum("capability_status", [
  "draft",
  "evaluating",
  "live",
  "deprecated",
  "rolled_back",
]);
export const versionDeployEnum = pgEnum("version_deploy_status", [
  "shadow",
  "canary",
  "promoted",
  "demoted",
  "rolled_back",
]);
export const executionIntentStatusEnum = pgEnum("execution_intent_status", [
  "pending",
  "routing",
  "executing",
  "completed",
  "failed",
  "escalated",
]);
export const routeDecisionEnum = pgEnum("route_decision", [
  "execute",
  "shadow",
  "fallback",
  "escalate",
  "reject",
]);
export const outcomeVerdictEnum = pgEnum("outcome_verdict", [
  "success",
  "partial",
  "failure",
  "timeout",
  "error",
]);

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
export const waitlistStatusEnum = pgEnum("waitlist_status", ["pending", "approved", "rejected"]);
export const auditActorEnum = pgEnum("audit_actor_type", ["user", "system", "webhook", "agent"]);
export const auditSeverityEnum = pgEnum("audit_severity", ["info", "warn", "critical"]);
export const agentOpTypeEnum = pgEnum("agent_op_type", [
  "add", "remove", "update", "review",
  "suggest", "optimize",
  "test", "shadow", "compile",
]);
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free", "pro", "scale",
]);
export const agentOpStatusEnum = pgEnum("agent_op_status", [
  "pending", "running", "completed", "failed",
]);

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
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 4 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  verified: boolean("verified").default(false).notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  status: agentStatusEnum("status").default("evaluation").notNull(),
  verticals: jsonb("verticals").notNull(), // string[]
  description: text("description").notNull(),
  capabilities: jsonb("capabilities").notNull(), // { name, domain, description, triggers[], tags[], inputSchema?, outputSchema? }[]
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
  avgRoi: real("avg_roi").default(0).notNull(),
  wins: integer("wins").default(0).notNull(),
  stripeAccountId: varchar("stripe_account_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const intents = pgTable("intents", {
  id: varchar("id", { length: 16 }).primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  business: varchar("business", { length: 100 }).notNull(),
  vertical: verticalEnum("vertical").notNull(),
  status: intentStatusEnum("status").default("bidding").notNull(),
  queries: text("queries").notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  bids: integer("bids").default(0).notNull(),
  created: varchar("created", { length: 20 }).notNull(),
  budget: varchar("budget", { length: 30 }).notNull(),
  agent: varchar("agent", { length: 100 }),
  agentId: varchar("agent_id", { length: 16 }),
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
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  intentId: varchar("intent_id", { length: 16 }).notNull(),
  agentId: varchar("agent_id", { length: 16 }).notNull(),
  capabilityId: varchar("capability_id", { length: 32 }),
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

// ─── WAITLIST ───

export const waitlist = pgTable(
  "waitlist",
  {
    id: varchar("id", { length: 16 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    imageUri: varchar("image_uri", { length: 500 }),
    status: waitlistStatusEnum("status").default("pending").notNull(),
    slotNumber: integer("slot_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("waitlist_email_idx").on(table.email)],
);

// ─── ESCROW ───

// ─── AUDIT LOG ───

export const auditLog = pgTable(
  "audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    actorType: auditActorEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: varchar("entity_id", { length: 64 }),
    requestId: varchar("request_id", { length: 64 }),
    sessionId: varchar("session_id", { length: 64 }),
    jobId: varchar("job_id", { length: 16 }),
    escrowId: varchar("escrow_id", { length: 16 }),
    stripeEventId: varchar("stripe_event_id", { length: 64 }),
    severity: auditSeverityEnum("severity").default("info").notNull(),
    metadata: jsonb("metadata"),
    ipHash: varchar("ip_hash", { length: 16 }),
    userAgent: varchar("user_agent", { length: 500 }),
  },
  (table) => [
    index("audit_log_event_type_idx").on(table.eventType),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

// ─── ESCROW ───

// ─── MEMORY PLANE: CAPABILITIES ───

export const capabilities = pgTable(
  "capabilities",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    sourceKey: varchar("source_key", { length: 200 }).unique(),
    providerType: providerTypeEnum("provider_type").notNull(),
    status: capabilityStatusEnum("status").default("draft").notNull(),
    intentDomains: jsonb("intent_domains").notNull(), // string[] — classification, extraction, codegen, etc.
    inputSchema: jsonb("input_schema"), // JSON Schema for inputs
    outputSchema: jsonb("output_schema"), // JSON Schema for outputs
    preconditions: jsonb("preconditions"), // { requires: [], env: {}, scope: [] }
    resourceRequirements: jsonb("resource_requirements"), // { cpu, memory, gpu, network }
    securityScope: jsonb("security_scope"), // { allowedTools: [], dataAccess: [], privacyLevel }
    costModel: jsonb("cost_model"), // { baseCents, perTokenCents, perCallCents, model }
    latencyProfile: jsonb("latency_profile"), // { p50Ms, p95Ms, p99Ms, timeoutMs }
    qualityProfile: jsonb("quality_profile"), // { baselineScore, confidenceInterval, evaluatedAt }
    failureModes: jsonb("failure_modes"), // [{ mode, frequency, impact, mitigated }]
    dependencies: jsonb("dependencies"), // string[] — other capability IDs
    embedding: jsonb("embedding"), // number[] — semantic embedding vector
    binaryCode: text("binary_code"), // compressed binary representation for fast retrieval
    observedMetrics: jsonb("observed_metrics"), // { successRate, avgLatencyMs, avgCostCents, totalRuns }
    agentId: varchar("agent_id", { length: 16 }).references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("capabilities_provider_type_idx").on(table.providerType),
    index("capabilities_status_idx").on(table.status),
  ],
);

export const capabilityVersions = pgTable(
  "capability_versions",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    capabilityId: varchar("capability_id", { length: 32 })
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    versionTag: varchar("version_tag", { length: 40 }).notNull(), // semver or hash
    deployStatus: versionDeployEnum("deploy_status").default("shadow").notNull(),
    changelog: text("changelog"),
    inputSchema: jsonb("input_schema"),
    outputSchema: jsonb("output_schema"),
    costModel: jsonb("cost_model"),
    latencyProfile: jsonb("latency_profile"),
    qualityProfile: jsonb("quality_profile"),
    configSnapshot: jsonb("config_snapshot"), // frozen config at deploy time
    promotedAt: timestamp("promoted_at", { withTimezone: true }),
    demotedAt: timestamp("demoted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cap_versions_capability_idx").on(table.capabilityId),
    index("cap_versions_deploy_status_idx").on(table.deployStatus),
  ],
);

export const capabilityMetrics = pgTable(
  "capability_metrics",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    capabilityId: varchar("capability_id", { length: 32 })
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    versionId: varchar("version_id", { length: 32 }).references(() => capabilityVersions.id),
    domain: varchar("domain", { length: 100 }),
    environment: varchar("environment", { length: 60 }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    totalRuns: integer("total_runs").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    avgLatencyMs: real("avg_latency_ms"),
    p50LatencyMs: real("p50_latency_ms"),
    p95LatencyMs: real("p95_latency_ms"),
    p99LatencyMs: real("p99_latency_ms"),
    avgCostCents: real("avg_cost_cents"),
    avgQualityScore: real("avg_quality_score"),
    failureModeBreakdown: jsonb("failure_mode_breakdown"), // { [mode]: count }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cap_metrics_capability_idx").on(table.capabilityId),
    index("cap_metrics_window_idx").on(table.windowStart, table.windowEnd),
  ],
);

// ─── INTELLIGENCE PLANE: INTENTS & ROUTING ───

export const executionIntents = pgTable(
  "execution_intents",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    parentIntentId: varchar("parent_intent_id", { length: 32 }),
    goal: text("goal").notNull(),
    domain: varchar("domain", { length: 100 }),
    constraints: jsonb("constraints"), // { qualityMin, latencyMaxMs, budgetMaxCents, privacyLevel }
    qualityThreshold: real("quality_threshold"),
    latencyBoundMs: integer("latency_bound_ms"),
    budgetBoundCents: integer("budget_bound_cents"),
    privacyLevel: varchar("privacy_level", { length: 30 }),
    environment: varchar("environment", { length: 60 }),
    requiredScope: jsonb("required_scope"), // string[]
    inputFeatures: jsonb("input_features"), // extracted features from the goal
    status: executionIntentStatusEnum("status").default("pending").notNull(),
    selectedRouteId: varchar("selected_route_id", { length: 32 }),
    capabilityId: varchar("capability_id", { length: 32 }),
    agentId: varchar("agent_id", { length: 16 }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    sourceIntentId: varchar("source_intent_id", { length: 16 }), // link to marketplace intent
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("exec_intents_status_idx").on(table.status),
    index("exec_intents_domain_idx").on(table.domain),
  ],
);

export const intentCandidates = pgTable(
  "intent_candidates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    intentId: varchar("intent_id", { length: 32 })
      .notNull()
      .references(() => executionIntents.id, { onDelete: "cascade" }),
    capabilityId: varchar("capability_id", { length: 32 })
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    versionId: varchar("version_id", { length: 32 }),
    retrievalStage: varchar("retrieval_stage", { length: 30 }).notNull(), // binary | rerank | policy
    retrievalRank: integer("retrieval_rank"),
    semanticScore: real("semantic_score"),
    // Quote estimates
    quotedCostCents: integer("quoted_cost_cents"),
    quotedLatencyMs: integer("quoted_latency_ms"),
    quotedQuality: real("quoted_quality"),
    quotedFailureRisk: real("quoted_failure_risk"),
    quotedPolicyRisk: real("quoted_policy_risk"),
    quotedRepairCost: integer("quoted_repair_cost"),
    // Composite score
    routeScore: real("route_score"),
    decision: routeDecisionEnum("decision"),
    policyViolations: jsonb("policy_violations"), // string[]
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("intent_candidates_intent_idx").on(table.intentId),
    index("intent_candidates_capability_idx").on(table.capabilityId),
  ],
);

// ─── EXECUTION PLANE ───

export const executions = pgTable(
  "executions",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    intentId: varchar("intent_id", { length: 32 })
      .notNull()
      .references(() => executionIntents.id),
    capabilityId: varchar("capability_id", { length: 32 })
      .notNull()
      .references(() => capabilities.id),
    versionId: varchar("version_id", { length: 32 }),
    routeDecision: routeDecisionEnum("route_decision").notNull(),
    // Execution trace
    inputPayload: jsonb("input_payload"),
    outputPayload: jsonb("output_payload"),
    traceLog: jsonb("trace_log"), // [{ step, timestamp, action, result }]
    // Observed metrics
    actualCostCents: integer("actual_cost_cents"),
    actualLatencyMs: integer("actual_latency_ms"),
    tokensUsed: integer("tokens_used"),
    // Status
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
    fallbackTriggered: boolean("fallback_triggered").default(false).notNull(),
    repairRequired: boolean("repair_required").default(false).notNull(),
    environmentMeta: jsonb("environment_meta"), // { region, runtime, resourcesUsed }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("executions_intent_idx").on(table.intentId),
    index("executions_capability_idx").on(table.capabilityId),
  ],
);

// ─── ADAPTATION PLANE: OUTCOMES ───

export const outcomes = pgTable(
  "outcomes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    executionId: varchar("execution_id", { length: 32 })
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    capabilityId: varchar("capability_id", { length: 32 })
      .notNull()
      .references(() => capabilities.id),
    versionId: varchar("version_id", { length: 32 }),
    intentId: varchar("intent_id", { length: 32 }),
    verdict: outcomeVerdictEnum("verdict").notNull(),
    qualityScore: real("quality_score"),
    humanApproval: boolean("human_approval"),
    humanFeedback: text("human_feedback"),
    costDeltaCents: integer("cost_delta_cents"), // actual - quoted
    latencyDeltaMs: integer("latency_delta_ms"), // actual - quoted
    qualityDelta: real("quality_delta"), // actual - predicted
    fallbackUsed: boolean("fallback_used").default(false).notNull(),
    repairTriggered: boolean("repair_triggered").default(false).notNull(),
    dependencyChain: jsonb("dependency_chain"), // [capabilityId, ...]
    environmentMeta: jsonb("environment_meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("outcomes_execution_idx").on(table.executionId),
    index("outcomes_capability_idx").on(table.capabilityId),
    index("outcomes_verdict_idx").on(table.verdict),
  ],
);

// ─── ADAPTATION PLANE: VERSION EDGES ───

export const versionEdges = pgTable(
  "version_edges",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fromVersionId: varchar("from_version_id", { length: 32 })
      .notNull()
      .references(() => capabilityVersions.id, { onDelete: "cascade" }),
    toVersionId: varchar("to_version_id", { length: 32 })
      .notNull()
      .references(() => capabilityVersions.id, { onDelete: "cascade" }),
    // Deltas
    costDelta: real("cost_delta"),
    latencyDelta: real("latency_delta"),
    qualityDelta: real("quality_delta"),
    repairRateDelta: real("repair_rate_delta"),
    rollbackIncidence: real("rollback_incidence"),
    // Comparison metadata
    sampleSize: integer("sample_size").default(0).notNull(),
    intentFamily: varchar("intent_family", { length: 100 }),
    comparedAt: timestamp("compared_at", { withTimezone: true }),
    promotionRecommendation: varchar("promotion_recommendation", { length: 30 }), // promote | hold | demote | rollback
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("version_edges_from_idx").on(table.fromVersionId),
    index("version_edges_to_idx").on(table.toVersionId),
  ],
);

// ─── POLICY ENGINE ───

export const routingPolicies = pgTable("routing_policies", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  scope: jsonb("scope").notNull(), // { domains: [], environments: [], privacyLevels: [] }
  rules: jsonb("rules").notNull(), // { qualityMin, latencyMaxMs, budgetCeilingCents, allowExternal, allowShadow }
  weights: jsonb("weights").notNull(), // { quality, cost, latency, risk } — for EU scoring
  priority: integer("priority").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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

// ─── SMB SUBSCRIPTIONS ───

export const smbSubscriptions = pgTable("smb_subscriptions", {
  id: varchar("id", { length: 16 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  tier: subscriptionTierEnum("tier").default("free").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 64 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ─── AGENT OPERATIONS (audit log) ───

export const agentOperations = pgTable("agent_operations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id", { length: 16 })
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "set null" }),
  operation: agentOpTypeEnum("operation").notNull(),
  status: agentOpStatusEnum("status").default("pending").notNull(),
  input: jsonb("input"),
  result: jsonb("result"),
  error: text("error"),
  durationMs: integer("duration_ms"),
  costCents: integer("cost_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("agent_ops_agent_idx").on(table.agentId),
  index("agent_ops_user_idx").on(table.userId),
  index("agent_ops_op_idx").on(table.operation),
  index("agent_ops_created_idx").on(table.createdAt),
]);

// ─── SHADOW SUBSCRIPTIONS ───

export const shadowSubscriptions = pgTable("shadow_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id", { length: 16 })
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  competitorAgentId: varchar("competitor_agent_id", { length: 16 })
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  addedBy: varchar("added_by", { length: 20 }).notNull(),
  active: boolean("active").default(true).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  totalRuns: integer("total_runs").default(0).notNull(),
  totalCostCents: integer("total_cost_cents").default(0).notNull(),
  insights: jsonb("insights"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
}, (table) => [
  index("shadow_subs_user_idx").on(table.userId),
  index("shadow_subs_agent_idx").on(table.agentId),
  index("shadow_subs_competitor_idx").on(table.competitorAgentId),
]);
