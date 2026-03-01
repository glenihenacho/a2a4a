import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ft, blue, blueDeep, bg } from "../shared/tokens";
import { useMedia } from "../shared/hooks";
import { Badge, VBadge, ScoreBar, Card, ScrollX, Sparkline, BarChart, DonutChart } from "../shared/primitives";

const bgColor = bg;

// ─── DATA ───
const REVENUE_MONTHS = [
  { month: "Sep", clearing: 2400, milestones: 1800, total: 4200 },
  { month: "Oct", clearing: 3800, milestones: 2900, total: 6700 },
  { month: "Nov", clearing: 5100, milestones: 4200, total: 9300 },
  { month: "Dec", clearing: 4600, milestones: 5800, total: 10400 },
  { month: "Jan", clearing: 7200, milestones: 6400, total: 13600 },
  { month: "Feb", clearing: 8900, milestones: 7800, total: 16700 },
];

const TRANSACTIONS = [
  { id: "TXN-0041", type: "clearing", agent: "TechSEO Pro", client: "FastTrack Logistics", amount: 850, currency: "USDC", status: "settled", date: "2025-02-22", vertical: "SEO" },
  { id: "TXN-0040", type: "milestone", agent: "RankForge", client: "ClearView Solar", amount: 1200, currency: "USDC", status: "settled", date: "2025-02-21", vertical: "AIO" },
  { id: "TXN-0039", type: "clearing", agent: "OverviewFirst", client: "MindfulApp", amount: 620, currency: "USDC", status: "pending", date: "2025-02-21", vertical: "AIO" },
  { id: "TXN-0038", type: "milestone", agent: "OverviewFirst", client: "PetPals Vet", amount: 900, currency: "USDC", status: "settled", date: "2025-02-19", vertical: "AIO" },
  { id: "TXN-0037", type: "clearing", agent: "RankForge", client: "ClearView Solar", amount: 1400, currency: "USD", status: "settled", date: "2025-02-18", vertical: "SEO" },
  { id: "TXN-0036", type: "refund", agent: "SerpAgent", client: "Apex Dental", amount: -340, currency: "USDC", status: "settled", date: "2025-02-17", vertical: "SEO" },
  { id: "TXN-0035", type: "milestone", agent: "Linksmith AI", client: "GreenHaven Farms", amount: 750, currency: "USD", status: "settled", date: "2025-02-15", vertical: "SEO" },
  { id: "TXN-0034", type: "clearing", agent: "ContentMesh", client: "Bloom Botanicals", amount: 980, currency: "USDC", status: "settled", date: "2025-02-14", vertical: "AIO" },
];

const PERF_METRICS = {
  all: { milestoneSuccess: 68, clientRetention: 72, disputeRate: 4.2, avgTimeToEngage: "2.1d", avgBidsPerIntent: 3.4, engagementRate: 31 },
  SEO: { milestoneSuccess: 74, clientRetention: 78, disputeRate: 3.1, avgTimeToEngage: "1.8d", avgBidsPerIntent: 3.8, engagementRate: 35 },
  AIO: { milestoneSuccess: 61, clientRetention: 64, disputeRate: 5.8, avgTimeToEngage: "2.6d", avgBidsPerIntent: 2.9, engagementRate: 26 },
};
const VERTICAL_SPLIT = { seo: 55, aio: 45 };

const MOCK_AGENTS = [
  {
    id: "agt-001", name: "RankForge", avatar: "RF", version: "2.4.1",
    verified: true, signedAt: "2025-02-18T09:14:00Z", status: "live",
    verticals: ["SEO"],
    description: "Full-stack SEO agent specializing in technical audits, on-page optimization, and ranking milestone delivery. Operates autonomously across crawl, analyze, and implement phases.",
    capabilities: [
      { verb: "crawl_site", domain: "SEO", desc: "Deep site crawl with Core Web Vitals and crawlability analysis" },
      { verb: "audit_technical", domain: "SEO", desc: "Lighthouse-driven audit with prioritized fix recommendations" },
      { verb: "optimize_onpage", domain: "SEO", desc: "Title, meta, heading, and content structure optimization" },
      { verb: "build_links", domain: "SEO", desc: "Outreach-based backlink acquisition with relevance scoring" },
      { verb: "track_rankings", domain: "SEO", desc: "SERP position monitoring with keyword cluster analysis" },
    ],
    inputSchema: { fields: ["target_url", "keywords[]", "competitor_urls[]", "geo_target", "budget_cap"], version: "1.2" },
    outputSchema: { fields: ["audit_report", "ranking_changes[]", "backlinks_acquired[]", "lighthouse_scores", "action_log"], version: "1.2" },
    toolRequirements: ["web_crawler", "lighthouse_api", "serp_tracker", "email_sender", "content_analyzer"],
    sla: { latencyP50: "4.2s", latencyP99: "12s", maxCost: "$280/run", retryPolicy: "3x exp backoff, 30s base", supportWindow: "24/7 auto, 8h human", uptime: "99.7%" },
    policy: { disallowed: ["PII collection", "Cloaking", "Link spam", "Scraping w/o attribution"], dataRetention: "30d encrypted at rest", sandbox: "Network-restricted, allowlisted domains" },
    evalClaims: [
      { metric: "Lighthouse improvement", target: "+15pts avg", achieved: "+18pts", pass: true },
      { metric: "Keyword top-10 placement", target: "≥5 in 12 weeks", achieved: "6.2 avg", pass: true },
      { metric: "Crawl error reduction", target: "≥60% reduction", achieved: "72%", pass: true },
      { metric: "Budget adherence", target: "≤105% of cap", achieved: "98%", pass: true },
    ],
    stats: { totalRuns: 342, successRate: 94.7, avgRuntime: "18m", avgCost: "$142", activeContracts: 12, reputation: 92 },
    monthlyRev: 4200, wins: 28,
  },
  {
    id: "agt-002", name: "OverviewFirst", avatar: "OF", version: "3.1.0",
    verified: true, signedAt: "2025-02-20T11:30:00Z", status: "live",
    verticals: ["AIO"],
    description: "AIO-native agent purpose-built for Google AI Overview visibility. Restructures content, implements schema markup, and monitors AI citation status across target queries.",
    capabilities: [
      { verb: "restructure_content", domain: "AIO", desc: "Rewrite content for AI-friendly extraction and citation" },
      { verb: "implement_schema", domain: "AIO", desc: "Deploy FAQ, HowTo, and custom schema markup" },
      { verb: "monitor_aio", domain: "AIO", desc: "Track AI Overview appearances and citation status" },
      { verb: "generate_faq", domain: "AIO", desc: "Auto-generate structured FAQ blocks from content" },
      { verb: "optimize_entities", domain: "AIO", desc: "Entity resolution and knowledge graph alignment" },
    ],
    inputSchema: { fields: ["target_queries[]", "content_urls[]", "competitor_aio_analysis", "citation_goals", "budget_cap"], version: "2.0" },
    outputSchema: { fields: ["restructured_content[]", "schema_deployments[]", "aio_appearances[]", "citation_report", "entity_map"], version: "2.0" },
    toolRequirements: ["content_analyzer", "schema_validator", "aio_monitor", "knowledge_graph_api", "cms_writer"],
    sla: { latencyP50: "6.8s", latencyP99: "22s", maxCost: "$340/run", retryPolicy: "2x exp backoff, 60s base", supportWindow: "Biz hours + 4h emergency", uptime: "99.4%" },
    policy: { disallowed: ["Hallucinated citations", "Schema spam", "Content duplication", "Competitor defamation"], dataRetention: "45d encrypted at rest", sandbox: "Read-only CMS, write via approval queue" },
    evalClaims: [
      { metric: "AIO appearance rate", target: "≥3 queries in 16wk", achieved: "3.8 avg", pass: true },
      { metric: "Schema validation", target: "100% valid markup", achieved: "100%", pass: true },
      { metric: "Content restructure quality", target: "≥85% readability", achieved: "89%", pass: true },
      { metric: "Citation accuracy", target: "0 hallucinated", achieved: "0", pass: true },
    ],
    stats: { totalRuns: 186, successRate: 91.4, avgRuntime: "32m", avgCost: "$198", activeContracts: 8, reputation: 94 },
    monthlyRev: 3100, wins: 15,
  },
  {
    id: "agt-003", name: "Linksmith AI", avatar: "LS", version: "1.8.3",
    verified: true, signedAt: "2025-02-15T14:22:00Z", status: "live",
    verticals: ["SEO"],
    description: "Specialized link building agent combining prospecting, outreach, and placement verification in a single autonomous pipeline with human-in-the-loop approval gates.",
    capabilities: [
      { verb: "prospect_links", domain: "SEO", desc: "Identify high-authority link targets via relevance scoring" },
      { verb: "generate_outreach", domain: "SEO", desc: "Personalized outreach email generation and sequencing" },
      { verb: "verify_placement", domain: "SEO", desc: "Confirm link placement, anchor text, and follow status" },
      { verb: "analyze_backlinks", domain: "SEO", desc: "Competitor backlink profile gap analysis" },
    ],
    inputSchema: { fields: ["target_domain", "niche_keywords[]", "competitor_domains[]", "outreach_budget", "approval_webhook"], version: "1.0" },
    outputSchema: { fields: ["prospects[]", "outreach_log[]", "placements[]", "authority_delta", "cost_breakdown"], version: "1.0" },
    toolRequirements: ["backlink_analyzer", "email_sender", "web_scraper", "domain_authority_api"],
    sla: { latencyP50: "8.1s", latencyP99: "28s", maxCost: "$450/run", retryPolicy: "3x exp backoff, 45s base", supportWindow: "24/7 auto", uptime: "99.2%" },
    policy: { disallowed: ["PBN links", "Paid link schemes", "Spam anchor text", "Auto-email w/o approval"], dataRetention: "30d encrypted", sandbox: "Outbound email rate-limited, domain allowlist" },
    evalClaims: [
      { metric: "Link acquisition rate", target: "≥8/month", achieved: "11 avg", pass: true },
      { metric: "Domain authority avg", target: "DA ≥40", achieved: "DA 47", pass: true },
      { metric: "Outreach response rate", target: "≥12%", achieved: "14.6%", pass: true },
      { metric: "Placement verification", target: "100% verified", achieved: "97%", pass: false },
    ],
    stats: { totalRuns: 520, successRate: 88.3, avgRuntime: "2.1h", avgCost: "$312", activeContracts: 18, reputation: 89 },
    monthlyRev: 2800, wins: 41,
  },
  {
    id: "agt-004", name: "SerpAgent", avatar: "SA", version: "2.0.0",
    verified: false, signedAt: null, status: "evaluation",
    verticals: ["SEO"],
    description: "SEO agent in marketplace evaluation. Combines technical crawling with SERP position monitoring and mobile-first indexing optimization.",
    capabilities: [
      { verb: "crawl_site", domain: "SEO", desc: "Technical crawl with mobile-first indexing checks" },
      { verb: "track_rankings", domain: "SEO", desc: "Daily SERP tracking with competitor comparison" },
      { verb: "generate_content", domain: "SEO", desc: "SEO-optimized content drafts from keyword clusters" },
    ],
    inputSchema: { fields: ["target_url", "keywords[]", "vertical_priority", "budget_cap"], version: "0.9" },
    outputSchema: { fields: ["serp_report", "ranking_changes[]", "content_drafts[]", "performance_score"], version: "0.9" },
    toolRequirements: ["web_crawler", "content_generator", "serp_tracker"],
    sla: { latencyP50: "8.5s", latencyP99: "35s", maxCost: "$200/run", retryPolicy: "2x linear, 45s base", supportWindow: "Biz hours only", uptime: "97.8%" },
    policy: { disallowed: ["Content spinning", "Keyword stuffing", "Cloaking"], dataRetention: "14d", sandbox: "Standard hosted sandbox" },
    evalClaims: [
      { metric: "SERP improvement", target: "≥3 positions avg", achieved: "2.4 avg", pass: false },
      { metric: "Content quality", target: "≥80% readability", achieved: "82%", pass: true },
      { metric: "Budget adherence", target: "≤110% of cap", achieved: "104%", pass: true },
    ],
    stats: { totalRuns: 87, successRate: 79.3, avgRuntime: "24m", avgCost: "$165", activeContracts: 0, reputation: 0 },
    monthlyRev: 1900, wins: 19,
  },
  {
    id: "agt-005", name: "ContentMesh", avatar: "CM", version: "1.5.2",
    verified: true, signedAt: "2025-02-19T08:45:00Z", status: "live",
    verticals: ["AIO"],
    description: "Content-first AIO agent generating structured, citation-optimized content blocks. Converts existing pages into AIO-ready formats with entity linking and structured data.",
    capabilities: [
      { verb: "restructure_content", domain: "AIO", desc: "Transform pages into AI-extractable format" },
      { verb: "generate_structured_data", domain: "AIO", desc: "Auto-generate JSON-LD schema from content" },
      { verb: "entity_linking", domain: "AIO", desc: "Map content entities to knowledge graph nodes" },
      { verb: "citation_optimization", domain: "AIO", desc: "Optimize content for AI citation probability" },
    ],
    inputSchema: { fields: ["content_urls[]", "target_entities[]", "schema_preferences", "citation_targets[]", "budget_cap"], version: "1.4" },
    outputSchema: { fields: ["optimized_pages[]", "schema_blocks[]", "entity_map", "citation_score", "structured_data_report"], version: "1.4" },
    toolRequirements: ["content_analyzer", "schema_generator", "knowledge_graph_api", "cms_writer", "nlp_pipeline"],
    sla: { latencyP50: "5.1s", latencyP99: "18s", maxCost: "$260/run", retryPolicy: "3x exp backoff, 20s base", supportWindow: "24/7 auto", uptime: "99.5%" },
    policy: { disallowed: ["Hallucinated entities", "Schema manipulation", "Copyright infringement"], dataRetention: "30d encrypted", sandbox: "Read-only source, write to staging" },
    evalClaims: [
      { metric: "Schema validity rate", target: "100%", achieved: "100%", pass: true },
      { metric: "Entity accuracy", target: "≥95%", achieved: "97.2%", pass: true },
      { metric: "Citation score lift", target: "+20pts avg", achieved: "+24pts", pass: true },
      { metric: "Processing throughput", target: "≥10 pages/run", achieved: "12.4 avg", pass: true },
    ],
    stats: { totalRuns: 214, successRate: 96.3, avgRuntime: "14m", avgCost: "$118", activeContracts: 9, reputation: 91 },
    monthlyRev: 2100, wins: 10,
  },
  {
    id: "agt-006", name: "TechSEO Pro", avatar: "TP", version: "4.0.1",
    verified: true, signedAt: "2025-02-22T16:08:00Z", status: "live",
    verticals: ["SEO", "AIO"],
    description: "Enterprise-grade technical SEO agent with AIO schema capabilities. Handles large-scale crawls (100K+ pages), Core Web Vitals remediation, structured data for AI Overviews, and programmatic SEO at scale with CI/CD integration.",
    capabilities: [
      { verb: "crawl_site", domain: "SEO", desc: "Enterprise crawl engine, 100K+ pages, JS rendering" },
      { verb: "audit_technical", domain: "SEO", desc: "CWV deep-dive, server config, redirect chain analysis" },
      { verb: "generate_sitemaps", domain: "SEO", desc: "Dynamic XML sitemap generation and submission" },
      { verb: "optimize_onpage", domain: "SEO", desc: "Programmatic title/meta optimization at scale" },
      { verb: "implement_schema", domain: "AIO", desc: "Deploy structured data for AI Overview citation" },
      { verb: "monitor_indexing", domain: "SEO", desc: "Search Console integration for index coverage" },
    ],
    inputSchema: { fields: ["target_domain", "crawl_config", "priority_pages[]", "cwv_targets", "ci_cd_webhook", "budget_cap"], version: "3.0" },
    outputSchema: { fields: ["crawl_report", "cwv_analysis", "fixes_deployed[]", "sitemap_status", "index_coverage", "perf_delta"], version: "3.0" },
    toolRequirements: ["web_crawler_enterprise", "lighthouse_api", "search_console_api", "ci_cd_hook", "cdn_purge", "server_config_access"],
    sla: { latencyP50: "3.8s", latencyP99: "14s", maxCost: "$800/run", retryPolicy: "3x exp backoff, checkpoint resume", supportWindow: "Dedicated TAM, 2h response", uptime: "99.8%" },
    policy: { disallowed: ["Prod deploy w/o staging", "Schema changes w/o backup", "Crawl rate > site capacity"], dataRetention: "90d encrypted", sandbox: "CI/CD gated, staging-first, rollback-safe" },
    evalClaims: [
      { metric: "CWV pass rate", target: "≥90% pages", achieved: "93%", pass: true },
      { metric: "Crawl error reduction", target: "≥70%", achieved: "81%", pass: true },
      { metric: "Index coverage lift", target: "+15% indexed", achieved: "+22%", pass: true },
      { metric: "Deploy success rate", target: "100% rollback-safe", achieved: "100%", pass: true },
      { metric: "Scale handling", target: "100K pages/run", achieved: "142K max", pass: true },
    ],
    stats: { totalRuns: 610, successRate: 97.2, avgRuntime: "2.8h", avgCost: "$520", activeContracts: 22, reputation: 96 },
    monthlyRev: 5400, wins: 53,
  },
];

const WRAPPER_SPEC = {
  input: [
    { field: "intent", type: "IntentSpec", desc: "Target query, vertical, goals, success criteria" },
    { field: "constraints", type: "Constraints", desc: "Budget cap, time limit, geo scope, compliance rules" },
    { field: "context_pack", type: "ContextPack", desc: "Prior artifacts, competitor data, account history" },
    { field: "allowed_tools", type: "ToolRef[]", desc: "Allowlisted tool IDs the agent may invoke" },
    { field: "budget", type: "BudgetEnvelope", desc: "Hard ceiling with per-tool sub-allocations" },
  ],
  output: [
    { field: "artifacts[]", type: "Artifact[]", desc: "Reports, code, content, schema deployments" },
    { field: "metrics", type: "RunMetrics", desc: "Latency, cost breakdown, quality signals" },
    { field: "receipts[]", type: "Receipt[]", desc: "Cryptographic proof of each tool invocation" },
    { field: "status", type: "RunStatus", desc: "completed | failed | checkpoint | cancelled" },
    { field: "traces", type: "TraceLog", desc: "Deterministic trace for replay and audit" },
  ],
  responsibilities: [
    { label: "Format Translation", desc: "Marketplace job → agent-native format", icon: "⟐" },
    { label: "Budget Enforcement", desc: "Hard caps on spend + per-tool sub-limits", icon: "◈" },
    { label: "Tool Allowlist", desc: "Proxy layer restricting tool access", icon: "⊡" },
    { label: "Structured Telemetry", desc: "Real-time events for monitoring & billing", icon: "◉" },
    { label: "Checkpointing", desc: "Deterministic resume points for retry", icon: "⊞" },
    { label: "Artifact Schema", desc: "Outputs conform to standard RunResult", icon: "⬡" },
  ],
};

const SCAN_PHASES = [
  { id: "pull", label: "Pulling image", lines: img => [`$ docker pull ${img}`, `Resolving ${img.split("/")[0]}...`, `Pulling layers: ████████████████████ 100%`, `Digest: sha256:${Array.from({length:12},()=>Math.floor(Math.random()*16).toString(16)).join("")}...`, `Image size: ${(180+Math.random()*120).toFixed(0)}MB`, `Status: Downloaded newer image`] },
  { id: "inspect", label: "Inspecting container", lines: img => [`$ docker inspect --format '{{json .Config}}' ${img.split(":")[0].split("/").pop()}`, `Entrypoint: ["python", "agent/main.py"]`, `WorkDir: /app`, `Env: AGENT_MODE=hosted, TELEMETRY=enabled`, `ExposedPorts: 8080/tcp, 9090/tcp (metrics)`, `Labels: com.agenticproxies.version, com.agenticproxies.verticals`, `Found: manifest.yaml at /app/manifest.yaml`] },
  { id: "manifest", label: "Parsing manifest", lines: () => [`Parsing /app/manifest.yaml...`, `├── name: detected`, `├── version: detected`, `├── verticals: detected`, `├── description: detected`, `└── signature: verifying...`, `Manifest signature: ✓ valid (ed25519)`] },
  { id: "capabilities", label: "Discovering capabilities", lines: () => [`Static analysis: scanning /app/agent/**/*.py`, `AST parse: 14 modules, 38 functions, 12 tool calls`, `Capability inference from decorated handlers:`] },
  { id: "schemas", label: "Inferring I/O schemas", lines: () => [`Type analysis: inspecting function signatures + pydantic models`, `Input schema inferred from JobSpec handler:`, `Output schema inferred from RunResult builder:`, `JobSpec ↔ RunResult conformance: ✓ valid`] },
  { id: "tools", label: "Detecting tool dependencies", lines: () => [`Scanning imports, requirements.txt, tool invocation patterns...`, `Tool proxy calls detected:`] },
  { id: "sla", label: "Benchmarking SLA", lines: () => [`Running 50 warm-up + 200 benchmark iterations...`, `Latency profiling complete:`] },
  { id: "policy", label: "Policy compliance scan", lines: () => [`Scanning for disallowed patterns...`, `Network egress + data handling audit:`, `Declared disallowed actions:`] },
  { id: "eval", label: "Extracting eval claims", lines: () => [`Parsing evaluation_claims from manifest...`, `Cross-referencing with benchmark results...`] },
  { id: "wrap", label: "Wrapping agent", lines: () => [`Generating Supply Agent Wrapper...`, `├── Format Translation: injected`, `├── Budget Enforcement: configured`, `├── Tool Allowlist proxy: configured`, `├── Telemetry: connected`, `├── Checkpointing: enabled`, `└── Artifact Schema: enabled`, `Wrapper: ✓ complete`, `Sandbox worker provisioned: worker-${Math.random().toString(36).slice(2,8)}`] },
];

const PIPELINE_STAGES = [
  { label: "Image Pulled", desc: "Container downloaded and verified" },
  { label: "Manifest Inferred", desc: "Capabilities, schemas, tools auto-discovered" },
  { label: "Wrapper Integrated", desc: "Sandbox provisioned, telemetry connected" },
  { label: "Sandbox Testing", desc: "Test JobSpecs validate end-to-end I/O" },
  { label: "Evaluation Run", desc: "Benchmark jobs verify claimed metrics" },
  { label: "Review & Approval", desc: "Compliance, telemetry, threshold checks" },
  { label: "Live on Marketplace", desc: "Published, routable, monitored" },
];

const MOCK_INTENTS = [
  { id: "INT-001", business: "Bloom Botanicals", vertical: "AIO", status: "bidding", queries: "skincare brand not in AI results", url: "bloombotanicals.com", bids: 4, created: "2025-02-20", budget: "$2,400/mo" },
  { id: "INT-002", business: "FastTrack Logistics", vertical: "SEO", status: "engaged", queries: "delivery service invisible on Google", url: "fasttracklogistics.com", bids: 3, created: "2025-02-18", budget: "$1,800/mo", agent: "TechSEO Pro" },
  { id: "INT-003", business: "MindfulApp", vertical: "AIO", status: "bidding", queries: "wellness app lost to AI overview competitors", url: "mindfulapp.io", bids: 2, created: "2025-02-21", budget: "$1,200/mo" },
  { id: "INT-004", business: "ClearView Solar", vertical: "AIO", status: "milestone", queries: "solar installer needs AI search visibility", url: "clearviewsolar.co", bids: 5, created: "2025-02-12", budget: "$3,600/mo", agent: "RankForge", milestone: "AIO appearance confirmed for 2/5 target queries" },
  { id: "INT-005", business: "PetPals Vet", vertical: "AIO", status: "completed", queries: "vet clinic missing from AI answers", url: "petpalsvet.com", bids: 3, created: "2025-01-28", budget: "$900/mo", agent: "OverviewFirst" },
  { id: "INT-006", business: "NovaBrew Coffee", vertical: "SEO", status: "bidding", queries: "coffee brand not ranking for subscriptions", url: "novabrew.com", bids: 1, created: "2025-02-22", budget: "$1,500/mo" },
];

const SLA_TEMPLATES = {
  SEO: [
    { id: "seo-1", name: "Technical Audit & Fix", desc: "Full site audit, Core Web Vitals, crawlability", timeline: "4 wk", metric: "90+ Lighthouse" },
    { id: "seo-2", name: "Keyword Ranking", desc: "Target keywords into top 10 positions", timeline: "8–12 wk", metric: "≥5 in top 10" },
    { id: "seo-3", name: "Revenue Share", desc: "% of incremental organic revenue", timeline: "Ongoing", metric: "Analytics attribution" },
  ],
  AIO: [
    { id: "aio-1", name: "Content Restructuring", desc: "Rewrite for AI-friendly extraction", timeline: "3–6 wk", metric: "AIO readiness ✓" },
    { id: "aio-2", name: "Structured Data", desc: "Schema markup for target pages", timeline: "2–4 wk", metric: "100% valid schema" },
    { id: "aio-3", name: "AIO Appearance", desc: "Appear in AI Overviews for target queries", timeline: "8–16 wk", metric: "≥3 queries" },
  ],
};

// ─── INTENT MARKET DATA ───
const INTENT_MARKET = [
  { id: 1, query: "my skincare brand doesn't show in AI answers", vol: 74000, volTrend: [31,38,42,51,58,67,74], aioRate: 82, ctr: 12, ctrDelta: -28, competition: 87, category: "Beauty & Wellness", opportunity: 91, vertical: "AIO", aioCited: 4, avgPos: 3.2 },
  { id: 2, query: "delivery company not ranking locally", vol: 165000, volTrend: [90,102,118,130,142,155,165], aioRate: 71, ctr: 18, ctrDelta: -22, competition: 93, category: "Logistics & Transport", opportunity: 68, vertical: "SEO", aioCited: 6, avgPos: 2.1 },
  { id: 3, query: "solar installer needs AI overview placement", vol: 52000, volTrend: [22,28,31,36,40,47,52], aioRate: 94, ctr: 8, ctrDelta: -41, competition: 62, category: "Home Services", opportunity: 95, vertical: "AIO", aioCited: 3, avgPos: 4.8 },
  { id: 4, query: "health app losing traffic to AI summaries", vol: 41000, volTrend: [18,22,25,29,34,38,41], aioRate: 88, ctr: 14, ctrDelta: -31, competition: 71, category: "Health & Fitness", opportunity: 84, vertical: "AIO", aioCited: 5, avgPos: 2.7 },
  { id: 5, query: "coffee subscription brand invisible on Google", vol: 33000, volTrend: [15,18,21,24,27,30,33], aioRate: 45, ctr: 32, ctrDelta: -8, competition: 78, category: "Food & Beverage", opportunity: 56, vertical: "SEO", aioCited: 2, avgPos: 5.4 },
  { id: 6, query: "veterinary clinic missing from emergency search", vol: 128000, volTrend: [70,82,90,98,108,118,128], aioRate: 76, ctr: 22, ctrDelta: -19, competition: 55, category: "Pet Services", opportunity: 79, vertical: "AIO", aioCited: 4, avgPos: 1.9 },
  { id: 7, query: "SaaS startup needs to rank for CRM searches", vol: 89000, volTrend: [45,52,60,68,74,82,89], aioRate: 91, ctr: 10, ctrDelta: -35, competition: 96, category: "SaaS & Tech", opportunity: 72, vertical: "AIO", aioCited: 7, avgPos: 3.5 },
  { id: 8, query: "energy company wants AI overview citations", vol: 97000, volTrend: [40,48,55,64,75,86,97], aioRate: 86, ctr: 11, ctrDelta: -33, competition: 44, category: "Home Services", opportunity: 93, vertical: "AIO", aioCited: 5, avgPos: 4.1 },
  { id: 9, query: "marketing agency can't rank its own site", vol: 28000, volTrend: [12,15,17,20,22,25,28], aioRate: 38, ctr: 36, ctrDelta: -5, competition: 82, category: "Professional Services", opportunity: 48, vertical: "SEO", aioCited: 1, avgPos: 6.2 },
  { id: 10, query: "AI writing tool buried by competitor overviews", vol: 112000, volTrend: [30,42,55,70,85,98,112], aioRate: 93, ctr: 9, ctrDelta: -38, competition: 89, category: "SaaS & Tech", opportunity: 88, vertical: "AIO", aioCited: 8, avgPos: 2.4 },
  { id: 11, query: "restaurant needs POS system review visibility", vol: 47000, volTrend: [25,28,32,36,39,43,47], aioRate: 79, ctr: 15, ctrDelta: -24, competition: 68, category: "Food & Beverage", opportunity: 76, vertical: "SEO", aioCited: 4, avgPos: 3.8 },
  { id: 12, query: "law firm losing leads to competitors on search", vol: 210000, volTrend: [150,162,170,182,192,200,210], aioRate: 64, ctr: 25, ctrDelta: -14, competition: 98, category: "Legal", opportunity: 62, vertical: "SEO", aioCited: 3, avgPos: 2.0 },
];

const INTENT_CATEGORIES = [
  { name: "SaaS & Tech", count: 2, avgAio: 92, avgVol: 100500, color: "#42A5F5" },
  { name: "Home Services", count: 2, avgAio: 90, avgVol: 74500, color: "#66BB6A" },
  { name: "Health & Fitness", count: 1, avgAio: 88, avgVol: 41000, color: "#AB47BC" },
  { name: "Beauty & Wellness", count: 1, avgAio: 82, avgVol: 74000, color: "#EC407A" },
  { name: "Food & Beverage", count: 2, avgAio: 62, avgVol: 40000, color: "#FFA726" },
  { name: "Pet Services", count: 1, avgAio: 76, avgVol: 128000, color: "#26C6DA" },
  { name: "Logistics & Transport", count: 1, avgAio: 71, avgVol: 165000, color: "#78909C" },
  { name: "Legal", count: 1, avgAio: 64, avgVol: 210000, color: "#EF5350" },
  { name: "Professional Services", count: 1, avgAio: 38, avgVol: 28000, color: "#90CAF9" },
];

const TRENDING_UP = [
  { query: "AI writing tool buried by competitor overviews", delta: "+273%", vol: "112K" },
  { query: "energy company wants AI overview citations", delta: "+143%", vol: "97K" },
  { query: "SaaS startup needs to rank for CRM searches", delta: "+98%", vol: "89K" },
  { query: "my skincare brand doesn't show in AI answers", delta: "+139%", vol: "74K" },
  { query: "solar installer needs AI overview placement", delta: "+136%", vol: "52K" },
];

const LIVE_SIGNALS = [
  { id: "SIG-001", query: "skincare brand not in AI answers", vertical: "AIO", status: "live", rank: 2, prevRank: 4, aioPos: "cited", avgSpend: 1840, topBid: 2400, agents: 5, impressions: 12400, clicks: 1488, ctr: 12.0, aioVisible: true, lastUpdate: "12s ago", spend7d: [1200,1400,1600,1750,1800,1820,1840], category: "Beauty & Wellness", signal: 94 },
  { id: "SIG-002", query: "delivery company not ranking locally", vertical: "SEO", status: "live", rank: 1, prevRank: 1, aioPos: "featured", avgSpend: 3200, topBid: 4100, agents: 8, impressions: 38200, clicks: 6876, ctr: 18.0, aioVisible: true, lastUpdate: "4s ago", spend7d: [2800,2900,3000,3050,3100,3150,3200], category: "Logistics & Transport", signal: 98 },
  { id: "SIG-003", query: "solar installer needs AI overview placement", vertical: "AIO", status: "live", rank: 5, prevRank: 8, aioPos: "cited", avgSpend: 980, topBid: 1500, agents: 3, impressions: 8900, clicks: 712, ctr: 8.0, aioVisible: true, lastUpdate: "28s ago", spend7d: [600,680,750,820,880,940,980], category: "Home Services", signal: 87 },
  { id: "SIG-004", query: "health app losing traffic to AI summaries", vertical: "AIO", status: "live", rank: 3, prevRank: 5, aioPos: "mentioned", avgSpend: 1100, topBid: 1600, agents: 4, impressions: 7200, clicks: 1008, ctr: 14.0, aioVisible: true, lastUpdate: "8s ago", spend7d: [700,800,850,920,980,1050,1100], category: "Health & Fitness", signal: 82 },
  { id: "SIG-005", query: "coffee brand invisible on Google", vertical: "SEO", status: "live", rank: 7, prevRank: 6, aioPos: "none", avgSpend: 720, topBid: 1100, agents: 2, impressions: 5600, clicks: 1792, ctr: 32.0, aioVisible: false, lastUpdate: "45s ago", spend7d: [500,540,580,620,660,690,720], category: "Food & Beverage", signal: 61 },
  { id: "SIG-006", query: "vet clinic missing from emergency search", vertical: "AIO", status: "live", rank: 2, prevRank: 3, aioPos: "featured", avgSpend: 2600, topBid: 3400, agents: 6, impressions: 22100, clicks: 4862, ctr: 22.0, aioVisible: true, lastUpdate: "2s ago", spend7d: [2000,2100,2250,2350,2450,2520,2600], category: "Pet Services", signal: 91 },
  { id: "SIG-007", query: "SaaS startup needs CRM search ranking", vertical: "AIO", status: "live", rank: 4, prevRank: 4, aioPos: "cited", avgSpend: 2100, topBid: 2900, agents: 7, impressions: 15800, clicks: 1580, ctr: 10.0, aioVisible: true, lastUpdate: "16s ago", spend7d: [1600,1700,1800,1880,1950,2030,2100], category: "SaaS & Tech", signal: 89 },
  { id: "SIG-008", query: "energy company wants AI overview citations", vertical: "AIO", status: "warming", rank: 6, prevRank: 9, aioPos: "cited", avgSpend: 860, topBid: 1200, agents: 3, impressions: 14200, clicks: 1562, ctr: 11.0, aioVisible: true, lastUpdate: "1m ago", spend7d: [400,480,560,640,720,790,860], category: "Home Services", signal: 85 },
  { id: "SIG-009", query: "AI writing tool buried by competitor overviews", vertical: "AIO", status: "live", rank: 3, prevRank: 7, aioPos: "featured", avgSpend: 2850, topBid: 3800, agents: 9, impressions: 19600, clicks: 1764, ctr: 9.0, aioVisible: true, lastUpdate: "6s ago", spend7d: [1800,2000,2200,2400,2550,2700,2850], category: "SaaS & Tech", signal: 96 },
  { id: "SIG-010", query: "law firm losing leads to competitors", vertical: "SEO", status: "live", rank: 1, prevRank: 1, aioPos: "none", avgSpend: 4800, topBid: 6200, agents: 11, impressions: 42000, clicks: 10500, ctr: 25.0, aioVisible: false, lastUpdate: "1s ago", spend7d: [4200,4350,4450,4550,4650,4720,4800], category: "Legal", signal: 99 },
  { id: "SIG-011", query: "restaurant needs POS review visibility", vertical: "SEO", status: "warming", rank: 8, prevRank: 11, aioPos: "mentioned", avgSpend: 640, topBid: 900, agents: 2, impressions: 6100, clicks: 915, ctr: 15.0, aioVisible: true, lastUpdate: "2m ago", spend7d: [320,380,440,500,550,590,640], category: "Food & Beverage", signal: 72 },
  { id: "SIG-012", query: "marketing agency can't rank own site", vertical: "SEO", status: "cooling", rank: 12, prevRank: 10, aioPos: "none", avgSpend: 380, topBid: 550, agents: 1, impressions: 3800, clicks: 1368, ctr: 36.0, aioVisible: false, lastUpdate: "5m ago", spend7d: [520,500,480,460,430,400,380], category: "Professional Services", signal: 41 },
];

const STATUS_CFG = {
  bidding: { label: "Bidding", color: "#FFA726", bg: "rgba(255,167,38,.1)" },
  engaged: { label: "Engaged", color: "#42A5F5", bg: "rgba(66,165,245,.1)" },
  milestone: { label: "In Progress", color: "#64B5F6", bg: "rgba(100,181,246,.1)" },
  completed: { label: "Completed", color: "#78909C", bg: "rgba(120,144,156,.1)" },
};

// ─── DASHBOARD ───
function Dashboard({ mob, tab }) {
  const [txnFilter, setTxnFilter] = useState("all");
  const [perfVert, setPerfVert] = useState("all");
  const filteredTxns = txnFilter === "all" ? TRANSACTIONS : TRANSACTIONS.filter(t => t.type === txnFilter);
  const totalRevenue = REVENUE_MONTHS.reduce((s, m) => s + m.total, 0);
  const thisMonth = REVENUE_MONTHS[REVENUE_MONTHS.length - 1];
  const lastMonth = REVENUE_MONTHS[REVENUE_MONTHS.length - 2];
  const revenueGrowth = Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100);
  const totalEscrow = TRANSACTIONS.filter(t => t.status === "pending").reduce((s, t) => s + Math.abs(t.amount), 0);
  const settledCount = TRANSACTIONS.filter(t => t.status === "settled").length;
  const platformFees = Math.round(totalRevenue * 0.12);
  const txnColors = { clearing: blue, milestone: "#64B5F6", refund: "#EF5350" };

  const kpis = [
    { label: "Total Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}k`, sub: `+${revenueGrowth}% MoM`, color: blue, spark: REVENUE_MONTHS.map(m => m.total) },
    { label: "This Month", value: `$${(thisMonth.total / 1000).toFixed(1)}k`, sub: `Clear $${(thisMonth.clearing / 1000).toFixed(1)}k`, color: "#64B5F6", spark: REVENUE_MONTHS.map(m => m.clearing) },
    { label: "Platform Fees", value: `$${(platformFees / 1000).toFixed(1)}k`, sub: "12% take rate", color: "#90CAF9", spark: REVENUE_MONTHS.map(m => Math.round(m.total * 0.12)) },
    { label: "In Escrow", value: `$${totalEscrow.toLocaleString()}`, sub: `${TRANSACTIONS.filter(t => t.status === "pending").length} pending`, color: "#FFA726" },
    { label: "Settled TXNs", value: settledCount, sub: `of ${TRANSACTIONS.length} total`, color: "#66BB6A" },
    { label: "Avg Bid/Demand", value: PERF_METRICS.all.avgBidsPerIntent, sub: `${PERF_METRICS.all.engagementRate}% engage`, color: "#AB47BC" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 16 : 24, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 22, fontWeight: 700 }}>Dashboard</h2>
        <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)" }}>Feb 24, 2025 · 14:32 UTC</div>
      </div>

      {/* KPI ROW — scrollable on mobile */}
      {mob ? (
        <ScrollX>
          <div style={{ display: "flex", gap: 10, paddingBottom: 4, minWidth: "max-content" }}>
            {kpis.map((kpi, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.07)", borderRadius: 12, padding: "14px 16px", minWidth: 140, position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", marginTop: 3 }}>{kpi.sub}</div>
                {kpi.spark && <div style={{ position: "absolute", bottom: 6, right: 6, opacity: .4 }}><Sparkline data={kpi.spark} width={44} height={18} color={kpi.color} /></div>}
              </div>
            ))}
          </div>
        </ScrollX>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: tab ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.07)", borderRadius: 14, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>{kpi.label}</div>
              <div style={{ fontFamily: ft.display, fontSize: 24, fontWeight: 700, color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", marginTop: 4 }}>{kpi.sub}</div>
              {kpi.spark && <div style={{ position: "absolute", bottom: 8, right: 8, opacity: .5 }}><Sparkline data={kpi.spark} width={60} height={24} color={kpi.color} /></div>}
            </div>
          ))}
        </div>
      )}

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : tab ? "1fr 1fr" : "1fr 280px 280px", gap: mob ? 12 : 16, marginTop: mob ? 12 : 0, marginBottom: mob ? 12 : 24 }}>
        <Card mob={mob}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700 }}>Revenue</h3>
            <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)" }}>6-month</span>
          </div>
          <BarChart data={REVENUE_MONTHS} labels={REVENUE_MONTHS.map(m => m.month)} keys={["clearing", "milestones"]} colors={[blue, "#64B5F6"]} mob={mob} />
        </Card>

        <Card mob={mob}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Vertical Split</h3>
          <div style={{ display: "flex", alignItems: mob ? "center" : "flex-start", gap: mob ? 20 : 0, flexDirection: mob ? "row" : "column" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <DonutChart segments={[
                { value: VERTICAL_SPLIT.seo, color: blue },
                { value: VERTICAL_SPLIT.aio, color: "#90CAF9" },
              ]} size={mob ? 90 : 110} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <div style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700 }}>{MOCK_INTENTS.length}</div>
                <div style={{ fontFamily: ft.mono, fontSize: 7, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>SMB Jobs</div>
              </div>
            </div>
            <div style={{ marginTop: mob ? 0 : 14, flex: 1, width: "100%" }}>
              {[{ label: "SEO", pct: VERTICAL_SPLIT.seo, color: blue }, { label: "AIO", pct: VERTICAL_SPLIT.aio, color: "#90CAF9" }].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} /><span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{s.label}</span></div>
                  <span style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: s.color }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card mob={mob}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700 }}>Performance</h3>
            <div style={{ display: "flex", gap: 3 }}>
              {["all", "SEO", "AIO"].map(v => (
                <button key={v} onClick={() => setPerfVert(v)} style={{ fontFamily: ft.mono, fontSize: 8, fontWeight: 600, padding: "3px 8px", borderRadius: 4, cursor: "pointer", border: "none", background: perfVert === v ? "rgba(66,165,245,.1)" : "transparent", color: perfVert === v ? blue : "rgba(255,255,255,.25)", textTransform: "uppercase" }}>{v === "all" ? "All" : v}</button>
              ))}
            </div>
          </div>
          {(() => { const pm = PERF_METRICS[perfVert]; return [
            { label: "Milestone Success", value: `${pm.milestoneSuccess}%`, bar: pm.milestoneSuccess, color: "#66BB6A" },
            { label: "Client Retention", value: `${pm.clientRetention}%`, bar: pm.clientRetention, color: "#AB47BC" },
            { label: "Dispute Rate", value: `${pm.disputeRate}%`, bar: pm.disputeRate, color: "#EF5350", inv: true },
            { label: "Avg Engage Time", value: pm.avgTimeToEngage, color: "#FFA726" },
          ]; })().map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{m.label}</span>
                <span style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: m.color }}>{m.value}</span>
              </div>
              {m.bar != null && <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.04)" }}><div style={{ width: `${m.bar}%`, height: "100%", borderRadius: 2, background: m.color, opacity: m.inv ? .7 : 1 }} /></div>}
            </div>
          ))}
        </Card>
      </div>

      {/* TRANSACTIONS */}
      <Card mob={mob} style={{ marginBottom: mob ? 12 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700 }}>Transactions</h3>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["all", "clearing", "milestone", "refund"].map(fl => (
              <button key={fl} onClick={() => setTxnFilter(fl)} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, background: txnFilter === fl ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.015)", color: txnFilter === fl ? blue : "rgba(255,255,255,.28)", border: `1px solid ${txnFilter === fl ? "rgba(66,165,245,.15)" : "rgba(255,255,255,.04)"}`, padding: "4px 8px", borderRadius: 5, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".05em" }}>{fl}</button>
            ))}
          </div>
        </div>
        {mob ? (
          /* Mobile: card list */
          <div style={{ display: "grid", gap: 8 }}>
            {filteredTxns.slice(0, 6).map(txn => (
              <div key={txn.id} style={{ background: "rgba(255,255,255,.015)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Badge color={txnColors[txn.type] || "#78909C"} bg={`${txnColors[txn.type] || "#78909C"}15`}>{txn.type}</Badge>
                    <VBadge v={txn.vertical} />
                  </div>
                  <span style={{ fontFamily: ft.mono, fontSize: 14, fontWeight: 700, color: txn.amount < 0 ? "#EF5350" : "#66BB6A" }}>{txn.amount < 0 ? "-" : "+"}${Math.abs(txn.amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{txn.agent}</div>
                    <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{txn.client}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Badge color={txn.status === "settled" ? "#66BB6A" : "#FFA726"} bg={txn.status === "settled" ? "rgba(102,187,106,.1)" : "rgba(255,167,38,.1)"}>{txn.status}</Badge>
                    <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", marginTop: 4 }}>{txn.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ScrollX>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(66,165,245,.05)" }}>
                {["TXN","Type","Agent","Client","Vertical","Amount","Status","Date"].map(h => <th key={h} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".1em", padding: "10px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>)}
              </tr></thead>
              <tbody>{filteredTxns.map(txn => (
                <tr key={txn.id} style={{ borderBottom: "1px solid rgba(255,255,255,.02)" }}>
                  <td style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.3)", padding: "10px" }}>{txn.id}</td>
                  <td style={{ padding: "10px" }}><Badge color={txnColors[txn.type] || "#78909C"} bg={`${txnColors[txn.type] || "#78909C"}15`}>{txn.type}</Badge></td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: "10px" }}>{txn.agent}</td>
                  <td style={{ fontSize: 12, color: "rgba(255,255,255,.4)", padding: "10px" }}>{txn.client}</td>
                  <td style={{ padding: "10px" }}><VBadge v={txn.vertical} /></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: txn.amount < 0 ? "#EF5350" : "#66BB6A", padding: "10px", whiteSpace: "nowrap" }}>{txn.amount < 0 ? "-" : "+"}${Math.abs(txn.amount)} <span style={{ fontSize: 9, color: "rgba(255,255,255,.18)" }}>{txn.currency}</span></td>
                  <td style={{ padding: "10px" }}><Badge color={txn.status === "settled" ? "#66BB6A" : "#FFA726"} bg={txn.status === "settled" ? "rgba(102,187,106,.1)" : "rgba(255,167,38,.1)"}>{txn.status}</Badge></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.18)", padding: "10px" }}>{txn.date}</td>
                </tr>
              ))}</tbody>
            </table>
          </ScrollX>
        )}
      </Card>

      {/* BOTTOM ROW */}
      <Card mob={mob}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Top Agents by Revenue</h3>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 0 : 20 }}>
          {[...MOCK_AGENTS].sort((a, b) => b.monthlyRev - a.monthlyRev).slice(0, 6).map((agent, idx) => {
            return (
              <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                <div style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.12)", width: 14 }}>#{idx + 1}</div>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{agent.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</div><div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.22)" }}>{agent.wins} wins</div></div>
                <div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 700, color: blue, flexShrink: 0 }}>${agent.monthlyRev.toLocaleString()}</div>
              </div>
            );
          })}
          </div>
      </Card>
    </div>
  );
}

// ─── INTENTS (Market Data) ───
function Intents({ mob, tab }) {
  const [industryTags, setIndustryTags] = useState([]);
  const [industryQuery, setIndustryQuery] = useState("");
  const [industryFocused, setIndustryFocused] = useState(false);
  const [sort, setSort] = useState("opportunity");
  const [expanded, setExpanded] = useState(null);
  const [focused, setFocused] = useState(null);
  const [qSearch, setQSearch] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [weeklyBudget, setWeeklyBudget] = useState("");
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const industryRef = useRef(null);

  const industrySuggestions = useMemo(() => {
    const q = industryQuery.toLowerCase().trim();
    return INTENT_CATEGORIES
      .filter(c => !industryTags.some(t => t.name === c.name))
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [industryQuery, industryTags]);

  const addIndustry = (cat) => { if (!industryTags.some(t => t.name === cat.name)) setIndustryTags(p => [...p, cat]); setIndustryQuery(""); industryRef.current?.focus(); };
  const removeIndustry = (idx) => setIndustryTags(p => p.filter((_, i) => i !== idx));
  const clearIndustries = () => { setIndustryTags([]); setIndustryQuery(""); };
  const handleIndustryKey = (e) => {
    if (e.key === "Enter" && industryQuery.trim() && industrySuggestions.length > 0) addIndustry(industrySuggestions[0]);
    if (e.key === "Backspace" && !industryQuery && industryTags.length > 0) setIndustryTags(p => p.slice(0, -1));
    if (e.key === "Escape") setIndustryFocused(false);
  };

  const filtered = industryTags.length === 0 ? INTENT_MARKET : INTENT_MARKET.filter(i => industryTags.some(t => t.name === i.category));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "opportunity") return b.opportunity - a.opportunity;
    if (sort === "volume") return b.vol - a.vol;
    if (sort === "aioRate") return b.aioRate - a.aioRate;
    if (sort === "ctrDelta") return a.ctrDelta - b.ctrDelta;
    return 0;
  });

  const avgAio = Math.round(INTENT_MARKET.reduce((s, i) => s + i.aioRate, 0) / INTENT_MARKET.length);
  const avgCtrDrop = Math.round(INTENT_MARKET.reduce((s, i) => s + i.ctrDelta, 0) / INTENT_MARKET.length);
  const totalVol = INTENT_MARKET.reduce((s, i) => s + i.vol, 0);
  const highOpp = INTENT_MARKET.filter(i => i.opportunity >= 80).length;

  const kpis = [
    { label: "SMB Demand Signals", value: INTENT_MARKET.length, color: blue },
    { label: "Total Search Vol", value: `${(totalVol / 1000000).toFixed(1)}M`, color: "#64B5F6" },
    { label: "Avg AIO Rate", value: `${avgAio}%`, color: "#66BB6A" },
    { label: "Avg CTR Impact", value: `${avgCtrDrop}%`, color: "#EF5350" },
    { label: "High Opportunity", value: highOpp, color: "#FFA726" },
    { label: "Verticals", value: INTENT_CATEGORIES.length, color: "#AB47BC" },
  ];

  function HeatBar({ value, max = 100, color, width = 48 }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width, height: 6, borderRadius: 3, background: "rgba(255,255,255,.04)" }}>
          <div style={{ width: `${(value / max) * 100}%`, height: "100%", borderRadius: 3, background: color, transition: "width .4s" }} />
        </div>
        <span style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.45)", minWidth: 28 }}>{value}</span>
      </div>
    );
  }

  // ─── DETAIL PAGE ───
  const detailIntent = detailId ? INTENT_MARKET.find(i => i.id === detailId) : null;

  if (detailIntent) {
    const d = detailIntent.volTrend;
    const max = Math.max(...d); const min = Math.min(...d);
    const months = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    const chartH = mob ? 160 : 220; const chartW = mob ? 300 : 680;
    const pts = d.map((v, i) => ({ x: 40 + (i / (d.length - 1)) * (chartW - 60), y: 16 + (chartH - 40) - ((v - min) / (max - min || 1)) * (chartH - 40) }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L${pts[pts.length-1].x},${chartH} L${pts[0].x},${chartH} Z`;
    const growth = d.length >= 2 ? Math.round(((d[d.length-1] - d[0]) / d[0]) * 100) : 0;
    const catColor = INTENT_CATEGORIES.find(c => c.name === detailIntent.category)?.color || "#78909C";
    const budgetNum = parseFloat(weeklyBudget.replace(/[^0-9.]/g, "")) || 0;
    const monthlyEst = Math.round(budgetNum * 4.33);
    // Y-axis labels
    const ySteps = 5;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => Math.round(min + (max - min) * (i / ySteps)));

    return (
      <div>
        <button onClick={() => { setDetailId(null); setWeeklyBudget(""); setBudgetSaved(false); setGoingLive(false); }} style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.3)", background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0 }}>← Intent Market</button>

        {/* Header */}
        <div style={{ marginBottom: mob ? 14 : 24 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <VBadge v={detailIntent.vertical} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor }} />
              <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.3)" }}>{detailIntent.category}</span>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: detailIntent.opportunity >= 80 ? "rgba(102,187,106,.1)" : detailIntent.opportunity >= 60 ? "rgba(255,167,38,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${detailIntent.opportunity >= 80 ? "rgba(102,187,106,.2)" : detailIntent.opportunity >= 60 ? "rgba(255,167,38,.15)" : "rgba(255,255,255,.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.display, fontSize: 13, fontWeight: 700, color: detailIntent.opportunity >= 80 ? "#66BB6A" : detailIntent.opportunity >= 60 ? "#FFA726" : "rgba(255,255,255,.4)" }}>{detailIntent.opportunity}</div>
          </div>
          <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 26, fontWeight: 700, lineHeight: 1.2 }}>{detailIntent.query}</h2>
          <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", marginTop: 4 }}>ID: INTENT-{String(detailIntent.id).padStart(3, "0")} · Last indexed Feb 24, 2025</div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : tab ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: mob ? 14 : 24 }}>
          {[
            { l: "Search Volume", v: `${(detailIntent.vol/1000).toFixed(0)}K`, sub: "/month", c: "#E3F2FD" },
            { l: "6mo Growth", v: `+${growth}%`, sub: "indexed trend", c: "#66BB6A" },
            { l: "AIO Rate", v: `${detailIntent.aioRate}%`, sub: "overview trigger", c: "#66BB6A" },
            { l: "CTR Impact", v: `${detailIntent.ctrDelta}%`, sub: "from AIO displacement", c: "#EF5350" },
            { l: "Competition", v: `${detailIntent.competition}/100`, sub: "difficulty score", c: detailIntent.competition >= 85 ? "#EF5350" : detailIntent.competition >= 65 ? "#FFA726" : "#66BB6A" },
            { l: "Opp Score", v: detailIntent.opportunity, sub: "composite ranking", c: detailIntent.opportunity >= 80 ? "#66BB6A" : "#FFA726" },
          ].map((k, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 12, padding: mob ? "12px 14px" : "14px 16px" }}>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{k.l}</div>
              <div style={{ fontFamily: ft.display, fontSize: mob ? 22 : 26, fontWeight: 700, color: k.c }}>{k.v}</div>
              {k.sub && <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)", marginTop: 2 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Indexable Popularity Chart */}
        <Card mob={mob} style={{ marginBottom: mob ? 14 : 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 12 : 20 }}>
            <div>
              <h3 style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Indexable Popularity</h3>
              <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>Monthly search volume trend · 6 month window</div>
            </div>
            <div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 700, color: "#66BB6A", background: "rgba(102,187,106,.06)", padding: "4px 12px", borderRadius: 6 }}>+{growth}%</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <svg width={chartW} height={chartH + 30} style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id={`ipFill${detailIntent.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={blue} stopOpacity=".18" />
                  <stop offset="100%" stopColor={blue} stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {yLabels.map((yv, i) => {
                const yy = 16 + (chartH - 40) - ((yv - min) / (max - min || 1)) * (chartH - 40);
                return <g key={i}><line x1={40} y1={yy} x2={chartW - 20} y2={yy} stroke="rgba(255,255,255,.03)" /><text x={36} y={yy + 3} textAnchor="end" fill="rgba(255,255,255,.15)" style={{ fontFamily: ft.mono, fontSize: 8 }}>{(yv/1000).toFixed(0)}K</text></g>;
              })}
              {/* Area + Line */}
              <path d={area} fill={`url(#ipFill${detailIntent.id})`} />
              <path d={line} fill="none" stroke={blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {/* Dots + Values */}
              {pts.map((p, i) => <g key={i}>
                <circle cx={p.x} cy={p.y} r={5} fill="#0A0F1A" stroke={blue} strokeWidth={2.5} />
                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="rgba(255,255,255,.5)" style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600 }}>{(d[i]/1000).toFixed(0)}K</text>
              </g>)}
              {/* X-axis labels */}
              {months.slice(0, d.length).map((m, i) => <text key={`m${i}`} x={pts[i].x} y={chartH + 18} textAnchor="middle" fill="rgba(255,255,255,.2)" style={{ fontFamily: ft.mono, fontSize: 9 }}>{m}</text>)}
            </svg>
          </div>
        </Card>

        {/* Detail Grid */}
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 10 : 16, marginBottom: mob ? 14 : 24 }}>
          {/* AIO Landscape */}
          <Card mob={mob}>
            <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>AIO Landscape</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "AIO Trigger Rate", v: `${detailIntent.aioRate}%`, c: "#66BB6A" },
                { l: "Sources Cited", v: detailIntent.aioCited, c: blue },
                { l: "Avg SERP Position", v: `#${detailIntent.avgPos}`, c: "#E3F2FD" },
                { l: "CTR Displacement", v: `${detailIntent.ctrDelta}%`, c: "#EF5350" },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: "center", padding: 12, background: "rgba(255,255,255,.015)", borderRadius: 8 }}>
                  <div style={{ fontFamily: ft.display, fontSize: 20, fontWeight: 700, color: m.c }}>{m.v}</div>
                  <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase", marginTop: 3 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Budget & Activation */}
          <Card mob={mob} style={{ background: budgetSaved ? "rgba(102,187,106,.02)" : goingLive ? "rgba(66,165,245,.02)" : undefined, borderColor: budgetSaved ? "rgba(102,187,106,.12)" : goingLive ? "rgba(66,165,245,.12)" : undefined }}>
            <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Budget & Activation</h3>
            <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)", marginBottom: 16 }}>Set a weekly budget to activate this intent as a live signal</div>

            {budgetSaved ? (
              <div>
                <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(102,187,106,.1)", border: "1px solid rgba(102,187,106,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>✓</div>
                  <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: "#66BB6A" }}>Intent Live</div>
                  <div style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>${budgetNum.toLocaleString()}/week · ${monthlyEst.toLocaleString()}/mo est.</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setBudgetSaved(false)} style={{ flex: 1, fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", padding: "10px 0", borderRadius: 8, cursor: "pointer" }}>Edit Budget</button>
                  <button onClick={() => { setDetailId(null); setWeeklyBudget(""); setBudgetSaved(false); }} style={{ flex: 1, fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: blue, background: "rgba(66,165,245,.06)", border: "1px solid rgba(66,165,245,.12)", padding: "10px 0", borderRadius: 8, cursor: "pointer" }}>View in Live →</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Weekly Budget (USD)</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,.15)" }}>$</span>
                    <input value={weeklyBudget} onChange={e => setWeeklyBudget(e.target.value.replace(/[^0-9]/g, ""))} placeholder="500" style={{ width: "100%", fontFamily: ft.display, fontSize: 22, fontWeight: 700, background: "rgba(0,0,0,.25)", border: "1px solid rgba(66,165,245,.12)", borderRadius: 10, padding: "14px 14px 14px 32px", color: "#E3F2FD", outline: "none", textAlign: "left" }} />
                  </div>
                </div>
                {/* Quick budget pills */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {[250, 500, 1000, 2000, 5000].map(v => (
                    <button key={v} onClick={() => setWeeklyBudget(String(v))} style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: weeklyBudget === String(v) ? blue : "rgba(255,255,255,.25)", background: weeklyBudget === String(v) ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.02)", border: `1px solid ${weeklyBudget === String(v) ? "rgba(66,165,245,.15)" : "rgba(255,255,255,.04)"}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>${v.toLocaleString()}</button>
                  ))}
                </div>
                {/* Monthly estimate */}
                {budgetNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,.015)", borderRadius: 8, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>Monthly Estimate</div>
                      <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: "#E3F2FD", marginTop: 2 }}>${monthlyEst.toLocaleString()}<span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,.2)" }}>/mo</span></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>Cost per 1K Impressions</div>
                      <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: blue, marginTop: 2 }}>${detailIntent.vol > 0 ? ((monthlyEst / (detailIntent.vol / 1000)) ).toFixed(2) : "—"}</div>
                    </div>
                  </div>
                )}
                <button onClick={() => { if (budgetNum > 0) { setGoingLive(true); setTimeout(() => setBudgetSaved(true), 1200); } }} disabled={budgetNum <= 0} style={{ width: "100%", fontFamily: ft.display, fontSize: 16, fontWeight: 700, color: "#fff", background: budgetNum > 0 ? (goingLive ? "rgba(66,165,245,.15)" : `linear-gradient(135deg, ${blueDeep}, ${blue})`) : "rgba(255,255,255,.04)", border: "none", padding: "14px 0", borderRadius: 10, cursor: budgetNum > 0 && !goingLive ? "pointer" : "not-allowed", opacity: budgetNum > 0 ? 1 : .4, transition: "all .3s" }}>
                  {goingLive ? "Activating..." : "Go Live →"}
                </button>
                <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)", textAlign: "center", marginTop: 8 }}>Budget held in escrow · Agents bid competitively · SLA-enforced delivery</div>
              </div>
            )}
          </Card>
        </div>

        {/* Matched Intents (SMBs with similar needs) */}
        {(() => {
          const related = MOCK_INTENTS.filter(i => i.vertical === detailIntent.vertical);
          if (!related.length) return null;
          return (
            <Card mob={mob}>
              <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Related SMB Requests</h3>
              <div style={{ display: "grid", gap: 6 }}>
                {related.map(r => {
                  const sc = STATUS_CFG[r.status];
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,.015)", borderRadius: 8, border: "1px solid rgba(255,255,255,.03)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(66,165,245,.06)", border: "1px solid rgba(66,165,245,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: blue, flexShrink: 0 }}>{r.business.split(" ").map(w => w[0]).join("").slice(0,2)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.queries}</div>
                        <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{r.business} · {r.budget}</div>
                      </div>
                      <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}
      </div>
    );
  }

  // ─── MARKET LIST VIEW ───
  // ─── Search matching ───
  const qNorm = qSearch.toLowerCase().trim();
  const qResults = qNorm ? [
    ...MOCK_INTENTS.filter(i => i.queries.toLowerCase().includes(qNorm) || i.business.toLowerCase().includes(qNorm)).map(i => {
      const mm = INTENT_MARKET.find(m => m.query.toLowerCase().includes(i.queries.split(" ")[0].toLowerCase()) || i.queries.toLowerCase().includes(m.query.split(" ")[0].toLowerCase()));
      return { type: "intent", id: i.id, label: i.queries, sub: i.business, vertical: i.vertical, status: i.status, budget: i.budget, market: mm };
    }),
    ...INTENT_MARKET.filter(m => m.query.toLowerCase().includes(qNorm) && !MOCK_INTENTS.some(i => i.queries.toLowerCase().includes(m.query.split(" ")[0].toLowerCase()))).map(m => ({ type: "market", id: m.id, label: m.query, sub: `${(m.vol/1000).toFixed(0)}K/mo · AIO ${m.aioRate}%`, vertical: m.vertical, market: m })),
  ].slice(0, 8) : [];

  // When empty search + dropdown open, show all intents as recents
  const qRecents = !qNorm && qOpen ? MOCK_INTENTS.map(i => {
    const mm = INTENT_MARKET.find(m => m.query.toLowerCase().includes(i.queries.split(" ")[0].toLowerCase()) || i.queries.toLowerCase().includes(m.query.split(" ")[0].toLowerCase()));
    return { type: "intent", id: i.id, label: i.queries, sub: i.business, vertical: i.vertical, status: i.status, budget: i.budget, market: mm };
  }) : [];

  const dropdownItems = qNorm ? qResults : qRecents;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: mob ? 10 : 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 22, fontWeight: 700 }}>Intent Market</h2>
          <p style={{ fontFamily: ft.sans, fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 2 }}>SMB demand signals, AI Overview coverage gaps & agent opportunity</p>
        </div>
        <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)" }}>Updated Feb 24, 2025</div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div style={{ position: "relative", marginBottom: mob ? 10 : 18, zIndex: 20 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.15)", fontSize: 14, pointerEvents: "none" }}>⌕</span>
          <input
            value={qSearch}
            onChange={e => { setQSearch(e.target.value); setQOpen(true); }}
            onFocus={() => setQOpen(true)}
            placeholder="Search SMB intents, businesses, or demand signals..."
            style={{ width: "100%", fontFamily: ft.sans, fontSize: 14, background: "rgba(255,255,255,.025)", border: `1px solid ${qOpen ? "rgba(66,165,245,.2)" : "rgba(66,165,245,.08)"}`, borderRadius: qOpen && dropdownItems.length > 0 ? "12px 12px 0 0" : 12, padding: "13px 14px 13px 38px", color: "#E3F2FD", outline: "none", transition: "border-color .15s" }}
          />
          {qSearch && <button onClick={() => { setQSearch(""); setQOpen(false); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontFamily: ft.mono, fontSize: 14, color: "rgba(255,255,255,.2)", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
        </div>

        {/* Dropdown */}
        {qOpen && dropdownItems.length > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: -1, background: "#0C1220", border: "1px solid rgba(66,165,245,.15)", borderTop: "1px solid rgba(66,165,245,.06)", borderRadius: "0 0 12px 12px", maxHeight: mob ? 300 : 380, overflow: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
            {!qNorm && <div style={{ padding: "8px 16px 4px", fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.15)", letterSpacing: ".1em", textTransform: "uppercase" }}>Recent SMB Requests</div>}
            {dropdownItems.map((item, i) => {
              const st = item.status ? STATUS_CFG[item.status] : null;
              const isActive = item.market && focused === item.market.id;
              return (
                <div key={`${item.type}-${item.id}`} onClick={() => {
                  if (item.market) { setDetailId(item.market.id); setWeeklyBudget(""); setBudgetSaved(false); setGoingLive(false); }
                  setQOpen(false);
                  setQSearch(item.label);
                }} style={{ display: "flex", alignItems: "center", gap: 10, padding: mob ? "10px 14px" : "10px 16px", cursor: "pointer", background: "transparent", borderBottom: i < dropdownItems.length - 1 ? "1px solid rgba(255,255,255,.02)" : "none", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(66,165,245,.025)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {/* Icon */}
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: item.type === "market" ? "rgba(66,165,245,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${item.type === "market" ? "rgba(66,165,245,.1)" : "rgba(255,255,255,.04)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: ft.mono, fontSize: 10, color: item.type === "market" ? blue : "rgba(255,255,255,.25)" }}>{item.type === "market" ? "◉" : "▸"}</span>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? "#E3F2FD" : "rgba(255,255,255,.6)" }}>{item.label}</div>
                    <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                  </div>
                  {/* Right side */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                    {item.market && <Sparkline data={item.market.volTrend} width={mob ? 32 : 48} height={16} color={isActive ? blue : "rgba(66,165,245,.25)"} />}
                    <VBadge v={item.vertical} />
                    {st && <Badge color={st.color} bg={st.bg}>{st.label}</Badge>}
                    {!mob && item.budget && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>{item.budget}</span>}
                  </div>
                </div>
              );
            })}
            {qNorm && qResults.length === 0 && <div style={{ padding: "16px", textAlign: "center", fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.18)" }}>No matching queries</div>}
          </div>
        )}
        {/* Backdrop to close dropdown */}
        {qOpen && <div onClick={() => setQOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }} />}
      </div>

      {/* KPI strip */}
      {mob ? (
        <ScrollX>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4, minWidth: "max-content" }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 10, padding: "12px 14px", minWidth: 115 }}>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{k.label}</div>
                <div style={{ fontFamily: ft.display, fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </ScrollX>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: tab ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Middle row: Trending + Categories */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 10 : 16, marginTop: mob ? 10 : 0, marginBottom: mob ? 10 : 20 }}>
        {/* Trending */}
        <Card mob={mob}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Fastest Growing SMB Demands</h3>
          {TRENDING_UP.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.025)" }}>
              <span style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.12)", width: 18 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.query}</div>
              </div>
              <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.25)", flexShrink: 0 }}>{t.vol}/mo</div>
              <div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 700, color: "#66BB6A", flexShrink: 0, minWidth: 52, textAlign: "right" }}>{t.delta}</div>
            </div>
          ))}
        </Card>

        {/* Industry filter */}
        <Card mob={mob}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Filter by Industry</h3>
          <div style={{ position: "relative" }}>
            <div onClick={() => industryRef.current?.focus()} style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", background: "rgba(255,255,255,.02)", border: `1px solid ${industryFocused ? "rgba(66,165,245,.25)" : "rgba(66,165,245,.06)"}`, borderRadius: 8, padding: "6px 10px", transition: "border-color .2s", cursor: "text", minHeight: 36 }}>
              {industryTags.map((t, i) => (
                <span key={t.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: t.color, background: `${t.color}12`, border: `1px solid ${t.color}25`, borderRadius: 5, padding: "2px 6px 2px 8px", whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                  {t.name}
                  <span onClick={(e) => { e.stopPropagation(); removeIndustry(i); }} style={{ cursor: "pointer", opacity: .5, fontSize: 11, lineHeight: 1, marginLeft: 2 }}>×</span>
                </span>
              ))}
              <input ref={industryRef} value={industryQuery} onChange={e => setIndustryQuery(e.target.value)} onFocus={() => setIndustryFocused(true)} onBlur={() => setTimeout(() => setIndustryFocused(false), 150)} onKeyDown={handleIndustryKey} placeholder={industryTags.length ? "Add industry..." : "Type to filter by industry..."} style={{ fontFamily: ft.sans, fontSize: 12, background: "transparent", border: "none", color: "#E3F2FD", outline: "none", flex: "1 1 60px", minWidth: 60, padding: "2px 0" }} />
            </div>
            {industryFocused && industrySuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "rgba(10,15,26,.97)", border: "1px solid rgba(66,165,245,.12)", borderRadius: 8, padding: "4px 0", zIndex: 30, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 30px rgba(0,0,0,.4)" }}>
                {industrySuggestions.map(cat => {
                  const count = INTENT_MARKET.filter(m => m.category === cat.name).length;
                  return (
                    <div key={cat.name} onMouseDown={(e) => { e.preventDefault(); addIndustry(cat); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(66,165,245,.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.6)", flex: 1 }}>{cat.name}</span>
                      <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>{count} signal{count !== 1 ? "s" : ""}</span>
                      <span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: cat.color }}>{cat.avgAio}%</span>
                      <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>+ add</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {industryTags.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{filtered.length} of {INTENT_MARKET.length} signals</span>
              <button onClick={clearIndustries} style={{ fontFamily: ft.mono, fontSize: 10, color: blue, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear all</button>
            </div>
          )}
        </Card>
      </div>

      {/* Filters & Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".08em" }}>Sort:</span>
          {[{ k: "opportunity", l: "Opportunity" }, { k: "volume", l: "Volume" }, { k: "aioRate", l: "AIO Rate" }, { k: "ctrDelta", l: "CTR Impact" }].map(s => (
            <button key={s.k} onClick={() => setSort(s.k)} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, background: sort === s.k ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.015)", color: sort === s.k ? blue : "rgba(255,255,255,.28)", border: `1px solid ${sort === s.k ? "rgba(66,165,245,.15)" : "rgba(255,255,255,.04)"}`, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>{s.l}</button>
          ))}
        </div>
        {industryTags.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{industryTags.map(t => <Badge key={t.name} color={t.color} bg={`${t.color}12`}>{t.name}</Badge>)}</div>}
      </div>

      {/* Intent Index Table / Cards */}
      {mob ? (
        <div style={{ display: "grid", gap: 8 }}>
          {sorted.map(intent => (
            <div key={intent.id} onClick={() => { setDetailId(intent.id); setWeeklyBudget(""); setBudgetSaved(false); setGoingLive(false); }} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 12, padding: 14, cursor: "pointer", transition: "border-color .2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{intent.query}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <VBadge v={intent.vertical} />
                    <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)" }}>{intent.category}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ fontFamily: ft.display, fontSize: 20, fontWeight: 700, color: intent.opportunity >= 80 ? "#66BB6A" : intent.opportunity >= 60 ? "#FFA726" : "rgba(255,255,255,.4)", lineHeight: 1 }}>{intent.opportunity}</div>
                  <div style={{ fontFamily: ft.mono, fontSize: 7, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Opp Score</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Volume</div><div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#E3F2FD" }}>{(intent.vol / 1000).toFixed(0)}K</div></div>
                <div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>AIO Rate</div><div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#66BB6A" }}>{intent.aioRate}%</div></div>
                <div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>CTR</div><div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#EF5350" }}>{intent.ctrDelta}%</div></div>
                <div style={{ marginLeft: "auto" }}><Sparkline data={intent.volTrend} width={48} height={20} color={blue} /></div>
              </div>
              {expanded === intent.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>Competition</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600, color: intent.competition >= 85 ? "#EF5350" : intent.competition >= 65 ? "#FFA726" : "#66BB6A" }}>{intent.competition}/100</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>AIO Sources Cited</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600 }}>{intent.aioCited}</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>Avg Position</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600 }}>#{intent.avgPos}</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>6mo Growth</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600, color: "#66BB6A" }}>+{Math.round(((intent.volTrend[6] - intent.volTrend[0]) / intent.volTrend[0]) * 100)}%</div></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card mob={mob} style={{ padding: 0, overflow: "hidden" }}>
          <ScrollX>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(66,165,245,.06)" }}>
                {["","SMB Demand Signal","Category","Volume","Trend","AIO Rate","CTR Impact","Competition","Cited","Avg Pos","Opportunity"].map(h => (
                  <th key={h} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".07em", padding: "12px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{sorted.map((intent, idx) => (
                <tr key={intent.id} onClick={() => { setDetailId(intent.id); setWeeklyBudget(""); setBudgetSaved(false); setGoingLive(false); }} style={{ borderBottom: "1px solid rgba(255,255,255,.02)", cursor: "pointer", background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(66,165,245,.015)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", padding: "12px 10px", width: 28 }}>{idx + 1}</td>
                  <td style={{ padding: "12px 10px", maxWidth: 240 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{intent.query}</div>
                    <div style={{ marginTop: 3 }}><VBadge v={intent.vertical} /></div>
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: INTENT_CATEGORIES.find(c => c.name === intent.category)?.color || "#78909C" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{intent.category}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#E3F2FD", padding: "12px 10px", whiteSpace: "nowrap" }}>{(intent.vol / 1000).toFixed(0)}K<span style={{ fontSize: 9, color: "rgba(255,255,255,.18)" }}>/mo</span></td>
                  <td style={{ padding: "12px 10px" }}><Sparkline data={intent.volTrend} width={56} height={22} color={blue} /></td>
                  <td style={{ padding: "12px 10px" }}><HeatBar value={intent.aioRate} color="#66BB6A" /></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: intent.ctrDelta <= -30 ? "#EF5350" : intent.ctrDelta <= -15 ? "#FFA726" : "#66BB6A", padding: "12px 10px" }}>{intent.ctrDelta}%</td>
                  <td style={{ padding: "12px 10px" }}><HeatBar value={intent.competition} color={intent.competition >= 85 ? "#EF5350" : intent.competition >= 65 ? "#FFA726" : "#66BB6A"} /></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, color: "rgba(255,255,255,.45)", padding: "12px 10px", textAlign: "center" }}>{intent.aioCited}</td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, color: "rgba(255,255,255,.45)", padding: "12px 10px" }}>#{intent.avgPos}</td>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: intent.opportunity >= 80 ? "rgba(102,187,106,.1)" : intent.opportunity >= 60 ? "rgba(255,167,38,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${intent.opportunity >= 80 ? "rgba(102,187,106,.2)" : intent.opportunity >= 60 ? "rgba(255,167,38,.15)" : "rgba(255,255,255,.05)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.display, fontSize: 15, fontWeight: 700, color: intent.opportunity >= 80 ? "#66BB6A" : intent.opportunity >= 60 ? "#FFA726" : "rgba(255,255,255,.4)" }}>{intent.opportunity}</div>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </ScrollX>
        </Card>
      )}

      {/* MAGNIFIED TREND CHART */}
      {focused && (() => {
        const intent = INTENT_MARKET.find(i => i.id === focused) || null;
        if (!intent) return null;
        const d = intent.volTrend;
        const max = Math.max(...d); const min = Math.min(...d);
        const months = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
        const chartH = mob ? 120 : 160; const chartW = mob ? 280 : 520;
        const pts = d.map((v, i) => ({ x: (i / (d.length - 1)) * chartW, y: chartH - ((v - min) / (max - min || 1)) * (chartH - 20) }));
        const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const area = `${line} L${pts[pts.length-1].x},${chartH} L${pts[0].x},${chartH} Z`;
        const growth = d.length >= 2 ? Math.round(((d[d.length-1] - d[0]) / d[0]) * 100) : 0;
        return (
          <Card mob={mob} style={{ marginBottom: mob ? 10 : 20, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{intent.query}</div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <VBadge v={intent.vertical} />
                  <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)" }}>{intent.category}</span>
                  <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>·</span>
                  <span style={{ fontFamily: ft.mono, fontSize: 10, color: "#66BB6A" }}>{growth >= 0 ? "+" : ""}{growth}% 6mo</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                {[{ l: "Volume", v: `${(intent.vol/1000).toFixed(0)}K`, c: "#E3F2FD" },{ l: "AIO Rate", v: `${intent.aioRate}%`, c: "#66BB6A" },{ l: "CTR Impact", v: `${intent.ctrDelta}%`, c: "#EF5350" },{ l: "Opp Score", v: intent.opportunity, c: intent.opportunity >= 80 ? "#66BB6A" : "#FFA726" }].map((s,i) => (
                  <div key={i} style={{ textAlign: "center" }}><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>{s.l}</div><div style={{ fontFamily: ft.mono, fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</div></div>
                ))}
                <button onClick={() => setFocused(null)} style={{ fontFamily: ft.mono, fontSize: 12, color: "rgba(255,255,255,.2)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg width={chartW} height={chartH + 24} style={{ overflow: "visible" }}>
                <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={blue} stopOpacity=".2" /><stop offset="100%" stopColor={blue} stopOpacity="0" /></linearGradient></defs>
                <path d={area} fill="url(#trendFill)" />
                <path d={line} fill="none" stroke={blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0A0F1A" stroke={blue} strokeWidth={2} />)}
                {pts.map((p, i) => <text key={`v${i}`} x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,.4)" style={{ fontFamily: ft.mono, fontSize: 9 }}>{(d[i]/1000).toFixed(0)}K</text>)}
                {months.slice(0, d.length).map((m, i) => <text key={`m${i}`} x={(i / (d.length-1)) * chartW} y={chartH + 16} textAnchor="middle" fill="rgba(255,255,255,.15)" style={{ fontFamily: ft.mono, fontSize: 8 }}>{m}</text>)}
              </svg>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
// ─── AGENT DETAIL MODAL ───
function AgentDetailModal({ agent, mob, onClose }) {
  const [dtab, setDtab] = useState("manifest");
  const dtabs = ["manifest", "sla", "evaluation", "policy"];
  const vCol = { SEO: { c: blue, b: "rgba(66,165,245,.1)" }, AIO: { c: "#90CAF9", b: "rgba(144,202,249,.1)" } };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", width: mob ? "100%" : "min(880px, 90vw)", maxHeight: mob ? "92vh" : "85vh", background: "#0A0F1A", border: "1px solid rgba(66,165,245,.12)", borderRadius: mob ? "16px 16px 0 0" : 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: mob ? "14px 16px 10px" : "22px 28px 14px", borderBottom: "1px solid rgba(66,165,245,.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${blueDeep}40, ${blue}25)`, border: "1px solid rgba(66,165,245,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.mono, fontSize: 15, fontWeight: 700, color: blue }}>{agent.avatar}</div>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: ft.display, fontSize: mob ? 18 : 22, fontWeight: 700 }}>{agent.name}</span>
                  {agent.verified && <Badge color="#66BB6A" bg="rgba(102,187,106,.1)">✓ verified</Badge>}
                  <Badge color={blue} bg="rgba(66,165,245,.08)">hosted</Badge>
                  {agent.verticals.map(v => <VBadge key={v} v={v} />)}
                </div>
                <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.22)", marginTop: 2 }}>v{agent.version} · {agent.id}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)", lineHeight: 1.5, marginTop: 8 }}>{agent.description}</p>
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {dtabs.map(t => <button key={t} onClick={() => setDtab(t)} style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer", textTransform: "capitalize", border: "none", background: dtab === t ? "rgba(66,165,245,.1)" : "transparent", color: dtab === t ? blue : "rgba(255,255,255,.3)" }}>{t}</button>)}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: mob ? 16 : 28 }}>
          {dtab === "manifest" && (<div>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>Capabilities</div>
            <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
              {agent.capabilities.map((cap, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "rgba(255,255,255,.015)", borderRadius: 8, border: "1px solid rgba(66,165,245,.04)" }}>
                  <code style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: blue, whiteSpace: "nowrap", flexShrink: 0 }}>{cap.verb}</code>
                  <Badge color={vCol[cap.domain]?.c || blue} bg={vCol[cap.domain]?.b || "rgba(66,165,245,.1)"}>{cap.domain}</Badge>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", flex: 1, lineHeight: 1.4 }}>{cap.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#FFA726", letterSpacing: ".1em", marginBottom: 8 }}>INPUT SCHEMA v{agent.inputSchema.version}</div>
                <div style={{ background: "rgba(255,167,38,.02)", border: "1px solid rgba(255,167,38,.08)", borderRadius: 8, padding: 12 }}>
                  {agent.inputSchema.fields.map((fld, i) => <div key={i} style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.4)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{fld}</div>)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#66BB6A", letterSpacing: ".1em", marginBottom: 8 }}>OUTPUT SCHEMA v{agent.outputSchema.version}</div>
                <div style={{ background: "rgba(102,187,106,.02)", border: "1px solid rgba(102,187,106,.08)", borderRadius: 8, padding: 12 }}>
                  {agent.outputSchema.fields.map((fld, i) => <div key={i} style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.4)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,.02)" }}>{fld}</div>)}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Tool Requirements</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
              {agent.toolRequirements.map((t, i) => <span key={i} style={{ fontFamily: ft.mono, fontSize: 10, padding: "5px 12px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.08)", borderRadius: 6, color: "rgba(255,255,255,.35)" }}>{t}</span>)}
            </div>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10 }}>Runtime Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[{ l: "Total Runs", v: agent.stats.totalRuns.toLocaleString(), c: blue },{ l: "Success Rate", v: `${agent.stats.successRate}%`, c: agent.stats.successRate >= 90 ? "#66BB6A" : "#FFA726" },{ l: "Avg Runtime", v: agent.stats.avgRuntime, c: "#E3F2FD" },{ l: "Avg Cost", v: agent.stats.avgCost, c: blue },{ l: "Active", v: agent.stats.activeContracts, c: "#64B5F6" },{ l: "Reputation", v: `${agent.stats.reputation}/100`, c: agent.stats.reputation >= 90 ? "#66BB6A" : "#FFA726" }].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.015)", borderRadius: 8, padding: 10, textAlign: "center" }}>
                  <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>)}
          {dtab === "sla" && (<div>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(agent.sla).map(([key, val]) => {
                const labels = { latencyP50: "Latency P50", latencyP99: "Latency P99", maxCost: "Max Cost / Run", retryPolicy: "Retry Policy", supportWindow: "Support Window", uptime: "Uptime SLA" };
                const colors = { latencyP50: blue, latencyP99: "#FFA726", maxCost: "#EF5350", retryPolicy: "#AB47BC", supportWindow: "#64B5F6", uptime: "#66BB6A" };
                return (<div key={key} style={{ display: "flex", alignItems: mob ? "flex-start" : "center", flexDirection: mob ? "column" : "row", gap: mob ? 4 : 16, padding: "12px 14px", background: "rgba(255,255,255,.015)", borderRadius: 8 }}><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.25)", width: mob ? undefined : 130, flexShrink: 0, textTransform: "uppercase", letterSpacing: ".06em" }}>{labels[key]||key}</div><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600, color: colors[key]||"#E3F2FD" }}>{val}</div></div>);
              })}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: "rgba(66,165,245,.03)", border: "1px solid rgba(66,165,245,.08)", borderRadius: 10 }}>
              <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: blue, letterSpacing: ".08em", marginBottom: 6 }}>HOSTED COMPUTE</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.6 }}>Marketplace provisions sandboxed workers for this agent. Budget, tools, and policies are enforced centrally via the Supply Agent Wrapper.</p>
            </div>
          </div>)}
          {dtab === "evaluation" && (<div>
            <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
              {agent.evalClaims.map((cl, i) => (
                <div key={i} style={{ display: "flex", alignItems: mob ? "flex-start" : "center", flexDirection: mob ? "column" : "row", gap: mob ? 6 : 14, padding: "12px 14px", background: cl.pass ? "rgba(102,187,106,.02)" : "rgba(239,83,80,.02)", borderRadius: 8, border: `1px solid ${cl.pass ? "rgba(102,187,106,.1)" : "rgba(239,83,80,.1)"}` }}>
                  <span style={{ fontFamily: ft.mono, fontSize: 16, color: cl.pass ? "#66BB6A" : "#EF5350", flexShrink: 0 }}>{cl.pass ? "✓" : "✗"}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{cl.metric}</div><div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.22)" }}>Target: {cl.target}</div></div>
                  <div style={{ fontFamily: ft.mono, fontSize: 15, fontWeight: 700, color: cl.pass ? "#66BB6A" : "#EF5350" }}>{cl.achieved}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ background: "rgba(102,187,106,.05)", borderRadius: 10, padding: 14, flex: 1, textAlign: "center" }}><div style={{ fontFamily: ft.display, fontSize: 26, fontWeight: 700, color: "#66BB6A" }}>{agent.evalClaims.filter(c=>c.pass).length}/{agent.evalClaims.length}</div><div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.22)", textTransform: "uppercase", marginTop: 3 }}>Claims Passing</div></div>
              <div style={{ background: "rgba(66,165,245,.04)", borderRadius: 10, padding: 14, flex: 1, textAlign: "center" }}><div style={{ fontFamily: ft.display, fontSize: 26, fontWeight: 700, color: blue }}>{agent.stats.reputation||"—"}</div><div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.22)", textTransform: "uppercase", marginTop: 3 }}>Reputation</div></div>
            </div>
          </div>)}
          {dtab === "policy" && (<div>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "#EF5350", letterSpacing: ".08em", marginBottom: 10 }}>DISALLOWED ACTIONS</div>
            <div style={{ display: "grid", gap: 5, marginBottom: 20 }}>
              {agent.policy.disallowed.map((d, i) => (<div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 12px", background: "rgba(239,83,80,.02)", borderRadius: 7, border: "1px solid rgba(239,83,80,.06)" }}><span style={{ fontFamily: ft.mono, fontSize: 12, color: "#EF5350" }}>⊘</span><span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{d}</span></div>))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div style={{ padding: 14, background: "rgba(255,255,255,.015)", borderRadius: 8 }}><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: blue, letterSpacing: ".08em", marginBottom: 6 }}>DATA RETENTION</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{agent.policy.dataRetention}</div></div>
              <div style={{ padding: 14, background: "rgba(255,255,255,.015)", borderRadius: 8 }}><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "#AB47BC", letterSpacing: ".08em", marginBottom: 6 }}>SANDBOX</div><div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{agent.policy.sandbox}</div></div>
            </div>
            {agent.signedAt && (<div style={{ marginTop: 16, padding: 12, background: "rgba(102,187,106,.03)", border: "1px solid rgba(102,187,106,.08)", borderRadius: 8, display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 14 }}>🔐</span><div><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "#66BB6A" }}>MANIFEST SIGNED</div><div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.22)" }}>{new Date(agent.signedAt).toUTCString()}</div></div></div>)}
          </div>)}
        </div>
      </div>
    </div>
  );
}

// ─── NEW AGENT FLOW (Docker CLI + optional Specs tab) ───
function NewAgentFlow({ mob, onClose }) {
  const [imageUri, setImageUri] = useState("");
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [termLines, setTermLines] = useState([]);
  const [inferred, setInferred] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showSpecs, setShowSpecs] = useState(false);
  const termRef = useCallback(node => { if (node) node.scrollTop = node.scrollHeight; }, [termLines]);

  const inferFromImage = (uri) => {
    const name = uri.split("/").pop().split(":")[0].replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/\s/g, "");
    const tag = uri.includes(":") ? uri.split(":").pop() : "latest";
    const isAIO = /aio|overview|citation|schema|entity|content.?mesh/i.test(uri);
    const isBoth = /pro|enterprise|full|dual/i.test(uri);
    const verts = isBoth ? ["SEO", "AIO"] : isAIO ? ["AIO"] : ["SEO"];
    const seoCaps = [{ verb: "crawl_site", domain: "SEO", desc: "Deep site crawl with Core Web Vitals" },{ verb: "audit_technical", domain: "SEO", desc: "Lighthouse-driven audit with fix recommendations" },{ verb: "optimize_onpage", domain: "SEO", desc: "Title, meta, and content structure optimization" },{ verb: "track_rankings", domain: "SEO", desc: "SERP position monitoring" },{ verb: "build_links", domain: "SEO", desc: "Outreach-based backlink acquisition" }];
    const aioCaps = [{ verb: "restructure_content", domain: "AIO", desc: "Rewrite content for AI-friendly extraction" },{ verb: "implement_schema", domain: "AIO", desc: "Deploy FAQ, HowTo, and custom schema markup" },{ verb: "monitor_aio", domain: "AIO", desc: "Track AI Overview appearances and citation status" },{ verb: "optimize_entities", domain: "AIO", desc: "Entity resolution and knowledge graph alignment" }];
    let caps = []; let tls = []; let inF; let outF; let evals;
    if (verts.includes("SEO")) { caps.push(...seoCaps.slice(0, 3 + Math.floor(Math.random()*2))); tls.push("web_crawler","lighthouse_api","serp_tracker","content_analyzer"); }
    if (verts.includes("AIO")) { caps.push(...aioCaps.slice(0, 2 + Math.floor(Math.random()*2))); tls.push("schema_validator","aio_monitor","knowledge_graph_api","cms_writer"); }
    tls = [...new Set(tls)];
    inF = verts.includes("SEO") ? ["target_url","keywords[]","competitor_urls[]","geo_target","budget_cap"] : ["target_queries[]","content_urls[]","citation_goals","schema_preferences","budget_cap"];
    outF = verts.includes("SEO") ? ["audit_report","ranking_changes[]","lighthouse_scores","action_log"] : ["restructured_content[]","schema_deployments[]","aio_appearances[]","citation_report"];
    const p50 = (2+Math.random()*8).toFixed(1); const cost = (80+Math.random()*400).toFixed(0);
    evals = verts.includes("SEO")
      ? [{ metric: "Lighthouse improvement", target: "+15pts avg" },{ metric: "Keyword top-10 placement", target: "≥5 in 12wk" },{ metric: "Budget adherence", target: "≤105% of cap" }]
      : [{ metric: "AIO appearance rate", target: "≥3 queries in 16wk" },{ metric: "Schema validation", target: "100% valid markup" },{ metric: "Citation accuracy", target: "0 hallucinated" }];
    const dis = verts.includes("SEO") ? ["PII collection","Cloaking","Link spam","Keyword stuffing"] : ["Hallucinated citations","Schema spam","Content duplication","Copyright infringement"];
    return { name, version: tag === "latest" ? "1.0.0" : tag, verticals: verts, description: `Auto-discovered agent from ${uri}. ${caps.length} capabilities across ${verts.join(" + ")}. ${tls.length} tool dependencies.`, capabilities: caps, tools: tls, inputFields: inF, outputFields: outF, sla: { latencyP50: `${p50}s`, latencyP99: `${(parseFloat(p50)*2.5).toFixed(0)}s`, maxCost: `$${cost}/run`, retryPolicy: "3x exp backoff", supportWindow: "24/7 auto", uptime: "99.5%" }, disallowed: dis, dataRetention: "30d encrypted at rest", sandbox: "Network-restricted, allowlisted domains", evalClaims: evals };
  };

  useEffect(() => {
    if (!scanning || phase >= SCAN_PHASES.length) return;
    if (phase === -1) { setPhase(0); return; }
    const sp = SCAN_PHASES[phase]; const baseLines = sp.lines(imageUri); let extra = [];
    if (inferred) {
      if (sp.id === "manifest") extra = [`  name: "${inferred.name}"`, `  version: "${inferred.version}"`, `  verticals: [${inferred.verticals.join(", ")}]`];
      else if (sp.id === "capabilities") extra = inferred.capabilities.map(c => `  @capability ${c.verb} [${c.domain}]`);
      else if (sp.id === "schemas") extra = [`  input: { ${inferred.inputFields.join(", ")} }`, `  output: { ${inferred.outputFields.join(", ")} }`];
      else if (sp.id === "tools") extra = inferred.tools.map(t => `  ✓ ${t}`);
      else if (sp.id === "sla") extra = [`  P50: ${inferred.sla.latencyP50}  P99: ${inferred.sla.latencyP99}  Max: ${inferred.sla.maxCost}`];
      else if (sp.id === "policy") extra = inferred.disallowed.map(d => `  ⊘ ${d}`);
      else if (sp.id === "eval") extra = inferred.evalClaims.map(c => `  ◆ ${c.metric}: ${c.target}`);
    }
    const allLines = [...baseLines, ...extra]; let idx = 0; const timers = [];
    const add = () => { if (idx < allLines.length) { const l = allLines[idx]; setTermLines(p => [...p, { text: l, type: l.startsWith("$") ? "cmd" : l.includes("✓") ? "ok" : l.includes("⊘") ? "warn" : "info" }]); idx++; timers.push(setTimeout(add, 35+Math.random()*65)); } else { setTermLines(p => [...p, { text: `── ${sp.label}: done ──`, type: "sep" }]); timers.push(setTimeout(() => setPhase(p => p+1), 250)); } };
    add(); return () => timers.forEach(clearTimeout);
  }, [scanning, phase]);

  useEffect(() => { if (phase >= SCAN_PHASES.length && scanning) { setTermLines(p => [...p, { text: "", type: "info" }, { text: "Manifest fully inferred. Ready for review.", type: "ok" }]); setScanning(false); } }, [phase]);
  useEffect(() => { if (submitted && pipelineStep < PIPELINE_STAGES.length) { const t = setTimeout(() => setPipelineStep(p => p+1), 1200+pipelineStep*400); return () => clearTimeout(t); } }, [submitted, pipelineStep]);

  const startScan = () => { if (!imageUri.trim()) return; setInferred(inferFromImage(imageUri)); setTermLines([]); setPhase(-1); setScanning(true); };
  const scanDone = !scanning && phase >= SCAN_PHASES.length;
  const tCol = { cmd: "#FFA726", ok: "#66BB6A", warn: "#EF5350", info: "rgba(255,255,255,.4)", sep: "rgba(66,165,245,.3)" };
  const inp = { width: "100%", fontFamily: ft.mono, fontSize: 13, background: "rgba(0,0,0,.3)", border: "1px solid rgba(66,165,245,.12)", borderRadius: 8, padding: "10px 14px", paddingLeft: 26, color: "#E3F2FD", outline: "none" };

  if (submitted) return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, background: "rgba(102,187,106,.08)", border: "1px solid rgba(102,187,106,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>✓</div>
        <h2 style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Agent Submitted</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}><strong style={{ color: blue }}>{inferred?.name}</strong> is entering the ingestion pipeline.</p>
        <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", marginTop: 4 }}>{imageUri}</div>
      </div>
      <Card mob={mob}>
        {PIPELINE_STAGES.map((stage, i) => { const done = i < pipelineStep; const active = i === pipelineStep; const c = done ? "#66BB6A" : active ? blue : "rgba(255,255,255,.12)"; return (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 6, alignItems: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${c}`, background: done ? "rgba(102,187,106,.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .4s" }}>
              {done ? <span style={{ fontSize: 12, color: "#66BB6A" }}>✓</span> : <span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: c }}>{i + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: done ? "#66BB6A" : active ? "#E3F2FD" : "rgba(255,255,255,.2)", transition: "color .4s" }}>{stage.label}</div>
              <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)" }}>{stage.desc}</div>
            </div>
            {active && <span style={{ fontFamily: ft.mono, fontSize: 9, color: blue, animation: "blink 1s infinite" }}>processing</span>}
          </div>
        ); })}
      </Card>
      <style>{`@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: mob ? 14 : 22 }}>
        <button onClick={onClose} style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Registry</button>
        <h2 style={{ fontFamily: ft.display, fontSize: mob ? 18 : 22, fontWeight: 700, margin: 0 }}>New Agent</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {["Ingest", "Specs"].map(t => <button key={t} onClick={() => setShowSpecs(t === "Specs")} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, padding: "5px 12px", borderRadius: 5, cursor: "pointer", border: "none", background: (t === "Specs") === showSpecs ? "rgba(66,165,245,.1)" : "transparent", color: (t === "Specs") === showSpecs ? blue : "rgba(255,255,255,.25)" }}>{t}</button>)}
        </div>
      </div>

      {showSpecs ? (
        <div>
          <Card mob={mob} style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Supply Agent Wrapper — Reference</h3>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: mob ? 6 : 14, flexWrap: "wrap", justifyContent: "center" }}>
                {["Marketplace", "→", "Wrapper", "→", "Agent", "→", "Wrapper", "→", "Marketplace"].map((n, i) => i % 2 === 0 ? <div key={i} style={{ padding: "8px 14px", background: n === "Agent" ? "rgba(102,187,106,.06)" : "rgba(66,165,245,.04)", border: `1px solid ${n === "Agent" ? "rgba(102,187,106,.12)" : "rgba(66,165,245,.08)"}`, borderRadius: 8, fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: n === "Agent" ? "#66BB6A" : "#90CAF9" }}>{n}</div> : <span key={i} style={{ fontFamily: ft.mono, fontSize: 14, color: "rgba(66,165,245,.3)" }}>{n}</span>)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#FFA726", letterSpacing: ".08em", marginBottom: 8 }}>INPUT (JobSpec)</div>{WRAPPER_SPEC.input.map((f, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,.01)", borderRadius: 6, marginBottom: 4, border: "1px solid rgba(255,255,255,.02)" }}><code style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "#FFA726", whiteSpace: "nowrap" }}>{f.field}</code><span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>{f.type}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginLeft: "auto" }}>{f.desc}</span></div>)}</div>
              <div><div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#66BB6A", letterSpacing: ".08em", marginBottom: 8 }}>OUTPUT (RunResult)</div>{WRAPPER_SPEC.output.map((f, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,.01)", borderRadius: 6, marginBottom: 4, border: "1px solid rgba(255,255,255,.02)" }}><code style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "#66BB6A", whiteSpace: "nowrap" }}>{f.field}</code><span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>{f.type}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginLeft: "auto" }}>{f.desc}</span></div>)}</div>
            </div>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".08em", marginBottom: 10 }}>WRAPPER RESPONSIBILITIES</div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: 8 }}>
              {WRAPPER_SPEC.responsibilities.map((r, i) => <div key={i} style={{ padding: "12px 14px", background: "rgba(66,165,245,.02)", borderRadius: 10, border: "1px solid rgba(66,165,245,.06)" }}><span style={{ fontSize: 16, marginRight: 6 }}>{r.icon}</span><span style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 600 }}>{r.label}</span><div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 3 }}>{r.desc}</div></div>)}
            </div>
          </Card>
        </div>
      ) : (
        <div>
          <Card mob={mob} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Docker Image URI</div>
            <div style={{ display: "flex", gap: 8, flexDirection: mob ? "column" : "row" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: ft.mono, fontSize: 12, color: "rgba(66,165,245,.3)" }}>$</span>
                <input value={imageUri} onChange={e => setImageUri(e.target.value)} onKeyDown={e => e.key === "Enter" && startScan()} placeholder="registry.agenticproxies.com/agent-name:tag" style={inp} />
              </div>
              <button onClick={startScan} disabled={!imageUri.trim() || scanning} style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, color: "#fff", background: scanning ? "rgba(66,165,245,.15)" : `linear-gradient(135deg, ${blueDeep}, ${blue})`, border: "none", padding: "10px 22px", borderRadius: 8, cursor: imageUri.trim() && !scanning ? "pointer" : "not-allowed", whiteSpace: "nowrap", opacity: imageUri.trim() && !scanning ? 1 : .5 }}>Pull & Scan →</button>
            </div>
            {!imageUri && !termLines.length && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>examples:</span>
                {["registry.agenticproxies.com/rankforge:2.4.1", "ghcr.io/my-org/aio-optimizer:latest", "docker.io/enterprise-dual-pro:1.0"].map(ex => (
                  <button key={ex} onClick={() => setImageUri(ex)} style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(66,165,245,.4)", background: "rgba(66,165,245,.03)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>{ex}</button>
                ))}
              </div>
            )}
          </Card>

          {termLines.length > 0 && (
            <Card mob={mob} style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", background: "rgba(0,0,0,.2)" }}>
                <div style={{ display: "flex", gap: 4 }}>{["#EF5350","#FFA726","#66BB6A"].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: .4 }} />)}</div>
                <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)" }}>agenticproxies — agent scan</span>
                {scanning && <span style={{ fontFamily: ft.mono, fontSize: 9, color: blue, marginLeft: "auto" }}>● scanning</span>}
                {scanDone && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "#66BB6A", marginLeft: "auto" }}>✓ complete</span>}
              </div>
              <div ref={termRef} style={{ maxHeight: mob ? 240 : 300, overflow: "auto", padding: "10px 16px", background: "rgba(0,0,0,.35)", fontFamily: ft.mono, fontSize: mob ? 10 : 11, lineHeight: 1.7 }}>
                {termLines.map((l, i) => <div key={i} style={{ color: tCol[l.type], opacity: l.type === "sep" ? .6 : 1 }}>{l.text || "\u00A0"}</div>)}
                {scanning && <span style={{ color: blue, animation: "blink 1s infinite" }}>▊</span>}
              </div>
              <style>{`@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
            </Card>
          )}

          {inferred && scanDone && (
            <Card mob={mob} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, margin: 0 }}>Inferred Manifest</h3>
                <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)" }}>click any section to override</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, padding: 12, background: "rgba(66,165,245,.02)", borderRadius: 10, border: "1px solid rgba(66,165,245,.06)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `linear-gradient(135deg, ${blueDeep}40, ${blue}25)`, border: "1px solid rgba(66,165,245,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.mono, fontSize: 14, fontWeight: 700, color: blue, flexShrink: 0 }}>{inferred.name.slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700 }}>{inferred.name}</span>
                    {inferred.verticals.map(v => <VBadge key={v} v={v} />)}
                    <Badge color={blue} bg="rgba(66,165,245,.08)">hosted</Badge>
                    <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.13)" }}>v{inferred.version}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 2 }}>{inferred.description}</div>
                </div>
              </div>
              {[
                { key: "capabilities", title: "Capabilities", color: blue, items: inferred.capabilities.map(c => `${c.verb} [${c.domain}]`), icon: "⟐" },
                { key: "inputFields", title: "Input Schema", color: "#FFA726", items: inferred.inputFields, icon: "⬡" },
                { key: "outputFields", title: "Output Schema", color: "#66BB6A", items: inferred.outputFields, icon: "⬡" },
                { key: "tools", title: "Tool Dependencies", color: blue, items: inferred.tools, icon: "◈" },
                { key: "sla", title: "SLA Benchmarks", color: "#AB47BC", items: Object.entries(inferred.sla).map(([k,v]) => `${k}: ${v}`), icon: "◎" },
                { key: "disallowed", title: "Disallowed Actions", color: "#EF5350", items: inferred.disallowed, icon: "⊘" },
                { key: "evalClaims", title: "Eval Claims", color: "#66BB6A", items: inferred.evalClaims.map(c => `${c.metric} → ${c.target}`), icon: "✓" },
              ].map(sec => (
                <div key={sec.key} onClick={() => { if (editField !== sec.key) { setEditField(sec.key); setEditValue(sec.items.join("\n")); } }} style={{ marginBottom: 8, padding: "10px 14px", background: editField === sec.key ? "rgba(66,165,245,.03)" : "rgba(255,255,255,.01)", border: `1px solid ${editField === sec.key ? "rgba(66,165,245,.15)" : "rgba(255,255,255,.03)"}`, borderRadius: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, opacity: .5 }}>{sec.icon}</span><span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: sec.color, letterSpacing: ".08em", textTransform: "uppercase" }}>{sec.title}</span><span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>{sec.items.length}</span></div>
                    {editField === sec.key ? <button onClick={e => { e.stopPropagation(); setEditField(null); }} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "#66BB6A", background: "rgba(102,187,106,.06)", border: "1px solid rgba(102,187,106,.12)", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>Done</button> : <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.1)" }}>edit ›</span>}
                  </div>
                  {editField === sec.key ? <textarea value={editValue} onClick={e => e.stopPropagation()} onChange={e => setEditValue(e.target.value)} rows={Math.min(8, sec.items.length+1)} style={{ width: "100%", fontFamily: ft.mono, fontSize: 11, background: "rgba(0,0,0,.25)", border: "1px solid rgba(66,165,245,.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,.5)", outline: "none", resize: "vertical", lineHeight: 1.8 }} /> : <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{sec.items.slice(0, mob ? 4 : 8).map((item, j) => <span key={j} style={{ fontFamily: ft.mono, fontSize: 10, padding: "3px 9px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.05)", borderRadius: 5, color: "rgba(255,255,255,.35)" }}>{item}</span>)}{sec.items.length > (mob ? 4 : 8) && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>+{sec.items.length-(mob?4:8)}</span>}</div>}
                </div>
              ))}
              <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => setSubmitted(true)} style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #1B5E20, #66BB6A)", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer" }}>Confirm & Submit →</button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AGENT REGISTRY ───
function Agents({ mob, tab }) {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState([]);
  const [committed, setCommitted] = useState([]);
  const [sort, setSort] = useState("reputation");
  const [selected, setSelected] = useState(null);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  /* ── build suggestion pool ── */
  const allSuggestions = useMemo(() => {
    const s = new Map();
    MOCK_AGENTS.forEach(a => {
      s.set(a.name, { label: a.name, type: "agent", icon: "◆" });
      a.verticals.forEach(v => s.set(`v:${v}`, { label: v, type: "vertical", icon: "⬡" }));
      a.capabilities.forEach(c => s.set(`c:${c.verb}`, { label: c.verb, type: "capability", icon: "⚙" }));
      s.set(`s:${a.status}`, { label: a.status, type: "status", icon: a.status === "live" ? "●" : "◐" });
    });
    return [...s.values()];
  }, []);

  /* ── filtered suggestions based on current query ── */
  const suggestions = useMemo(() => {
    if (!query.trim()) return allSuggestions.slice(0, 8);
    const q = query.toLowerCase();
    return allSuggestions.filter(s => s.label.toLowerCase().includes(q) && !tags.some(t => t.label === s.label && t.type === s.type)).slice(0, 6);
  }, [query, tags, allSuggestions]);

  const addTag = (sug) => { if (!tags.some(t => t.label === sug.label && t.type === sug.type)) setTags(p => [...p, sug]); setQuery(""); inputRef.current?.focus(); };
  const removeTag = (idx) => setTags(p => p.filter((_, i) => i !== idx));
  const submitSearch = () => { setCommitted([...tags]); setFocused(false); };
  const clearAll = () => { setTags([]); setCommitted([]); setQuery(""); };

  const handleKey = (e) => {
    if (e.key === "Enter") { if (query.trim() && suggestions.length > 0) addTag(suggestions[0]); else submitSearch(); }
    if (e.key === "Backspace" && !query && tags.length > 0) setTags(p => p.slice(0, -1));
    if (e.key === "Escape") setFocused(false);
  };

  /* ── filter agents against committed tags ── */
  const filtered = MOCK_AGENTS
    .filter(a => {
      if (committed.length === 0) return true;
      return committed.every(t => {
        if (t.type === "agent") return a.name === t.label;
        if (t.type === "vertical") return a.verticals.includes(t.label);
        if (t.type === "capability") return a.capabilities.some(c => c.verb === t.label);
        if (t.type === "status") return a.status === t.label;
        return true;
      });
    })
    .sort((a, b) => sort === "reputation" ? b.stats.reputation - a.stats.reputation : sort === "runs" ? b.stats.totalRuns - a.stats.totalRuns : sort === "success" ? b.stats.successRate - a.stats.successRate : parseFloat(a.stats.avgCost.replace("$","")) - parseFloat(b.stats.avgCost.replace("$","")));

  const totalCaps = MOCK_AGENTS.reduce((s, a) => s + a.capabilities.length, 0);
  const verifiedCount = MOCK_AGENTS.filter(a => a.verified).length;
  const liveCount = MOCK_AGENTS.filter(a => a.status === "live").length;
  const avgRep = Math.round(MOCK_AGENTS.filter(a => a.stats.reputation > 0).reduce((s, a) => s + a.stats.reputation, 0) / MOCK_AGENTS.filter(a => a.stats.reputation > 0).length);

  const tagColors = { agent: blue, vertical: "#AB47BC", capability: "#26A69A", status: "#FFA726" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: mob ? 10 : 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 22, fontWeight: 700 }}>Agent Registry</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 2 }}>Supply agent manifests, SLA contracts & wrapper compliance</p>
        </div>
        {!showNewAgent && <button onClick={() => setShowNewAgent(true)} style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, border: "none", padding: "8px 18px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap" }}>+ New Agent</button>}
      </div>

      {showNewAgent ? (
        <NewAgentFlow mob={mob} onClose={() => setShowNewAgent(false)} />
      ) : (
        <div>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : tab ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: mob ? 14 : 22 }}>
            {[{ l: "Registered", v: MOCK_AGENTS.length, c: blue },{ l: "Live", v: liveCount, c: "#66BB6A" },{ l: "In Evaluation", v: MOCK_AGENTS.length - liveCount, c: "#FFA726" },{ l: "Capabilities", v: totalCaps, c: "#64B5F6" },{ l: "Verified", v: `${verifiedCount}/${MOCK_AGENTS.length}`, c: "#66BB6A" },{ l: "Avg Reputation", v: avgRep, c: blue }].map((k, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 12, padding: mob ? "12px 14px" : "14px 16px" }}>
                <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{k.l}</div>
                <div style={{ fontFamily: ft.display, fontSize: mob ? 22 : 26, fontWeight: 700, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Search bar with tags & suggestions */}
          <div style={{ position: "relative", marginBottom: mob ? 12 : 18 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div onClick={() => inputRef.current?.focus()} style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", background: "rgba(255,255,255,.025)", border: `1px solid ${focused ? "rgba(66,165,245,.25)" : "rgba(66,165,245,.08)"}`, borderRadius: 10, padding: "7px 12px", transition: "border-color .2s", cursor: "text" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: .3 }}><circle cx="11" cy="11" r="7" stroke="#E3F2FD" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#E3F2FD" strokeWidth="2" strokeLinecap="round"/></svg>
                {tags.map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: tagColors[t.type] || blue, background: `${tagColors[t.type] || blue}12`, border: `1px solid ${tagColors[t.type] || blue}25`, borderRadius: 5, padding: "2px 6px 2px 8px", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 8, opacity: .6 }}>{t.type === "agent" ? "◆" : t.type === "vertical" ? "⬡" : t.type === "capability" ? "⚙" : "●"}</span>
                    {t.label}
                    <span onClick={(e) => { e.stopPropagation(); removeTag(i); }} style={{ cursor: "pointer", opacity: .5, fontSize: 11, lineHeight: 1, marginLeft: 1 }}>×</span>
                  </span>
                ))}
                <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onKeyDown={handleKey} placeholder={tags.length ? "Add filter..." : "Search agents, capabilities, verticals..."} style={{ fontFamily: ft.sans, fontSize: 13, background: "transparent", border: "none", color: "#E3F2FD", outline: "none", flex: "1 1 80px", minWidth: 80, padding: "2px 0" }} />
              </div>
              {tags.length > 0 && (
                <button onClick={submitSearch} style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Filter</button>
              )}
              {committed.length > 0 && (
                <button onClick={clearAll} style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", padding: "8px 12px", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>Clear</button>
              )}
              <div style={{ display: "flex", gap: 4, marginLeft: mob ? 0 : "auto" }}>
                <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", alignSelf: "center", marginRight: 2 }}>Sort:</span>
                {[{ k: "reputation", l: "Rep" },{ k: "runs", l: "Runs" },{ k: "success", l: "Rate" },{ k: "cost", l: "Cost↓" }].map(s => (
                  <button key={s.k} onClick={() => setSort(s.k)} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, background: sort === s.k ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.015)", color: sort === s.k ? blue : "rgba(255,255,255,.28)", border: `1px solid ${sort === s.k ? "rgba(66,165,245,.12)" : "rgba(255,255,255,.04)"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>{s.l}</button>
                ))}
              </div>
            </div>

            {/* Suggestion dropdown */}
            {focused && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: mob ? 0 : "unset", width: mob ? "100%" : 380, marginTop: 4, background: "rgba(10,15,26,.97)", border: "1px solid rgba(66,165,245,.12)", borderRadius: 10, padding: "6px 0", zIndex: 40, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.12)", textTransform: "uppercase", letterSpacing: ".1em", padding: "4px 14px 6px" }}>
                  {query.trim() ? "Matching filters" : "Suggested filters"}
                </div>
                {suggestions.map((s, i) => {
                  const c = tagColors[s.type] || blue;
                  const already = tags.some(t => t.label === s.label && t.type === s.type);
                  return (
                    <div key={`${s.type}-${s.label}`} onMouseDown={(e) => { e.preventDefault(); if (!already) addTag(s); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: already ? "default" : "pointer", opacity: already ? .3 : 1 }} onMouseEnter={e => { if (!already) e.currentTarget.style.background = "rgba(66,165,245,.06)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontFamily: ft.mono, fontSize: 10, color: c, width: 14, textAlign: "center" }}>{s.type === "agent" ? "◆" : s.type === "vertical" ? "⬡" : s.type === "capability" ? "⚙" : "●"}</span>
                      <span style={{ fontFamily: ft.sans, fontSize: 12, color: "#E3F2FD", flex: 1 }}>{s.label}</span>
                      <span style={{ fontFamily: ft.mono, fontSize: 8, color: c, background: `${c}10`, border: `1px solid ${c}20`, borderRadius: 3, padding: "1px 6px", textTransform: "uppercase" }}>{s.type}</span>
                      {!already && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>+ add</span>}
                    </div>
                  );
                })}
                {tags.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(66,165,245,.06)", margin: "4px 0 0", padding: "6px 14px 4px" }}>
                    <span onMouseDown={(e) => { e.preventDefault(); submitSearch(); }} style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: blue, cursor: "pointer" }}>↵ Apply {tags.length} filter{tags.length > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agent cards */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 10 : 14 }}>
            {filtered.map(agent => {
              const isEval = agent.status === "evaluation";
              return (
                <div key={agent.id} onClick={() => setSelected(agent)} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${isEval ? "rgba(255,167,38,.1)" : "rgba(66,165,245,.07)"}`, borderRadius: mob ? 12 : 14, padding: mob ? 14 : 18, cursor: "pointer", transition: "border-color .2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(66,165,245,.2)"} onMouseLeave={e => e.currentTarget.style.borderColor = isEval ? "rgba(255,167,38,.1)" : "rgba(66,165,245,.07)"}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `linear-gradient(135deg, ${blueDeep}35, ${blue}20)`, border: "1px solid rgba(66,165,245,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.mono, fontSize: 14, fontWeight: 700, color: blue, flexShrink: 0 }}>{agent.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: ft.display, fontSize: 17, fontWeight: 700 }}>{agent.name}</span>
                        {agent.verified && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "#66BB6A" }}>✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                        {agent.verticals.map(v => <VBadge key={v} v={v} />)}
                        <Badge color={isEval ? "#FFA726" : "#66BB6A"} bg={isEval ? "rgba(255,167,38,.08)" : "rgba(102,187,106,.08)"}>{agent.status}</Badge>
                        <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.13)" }}>v{agent.version}</span>
                      </div>
                    </div>
                    {agent.stats.reputation > 0 && (
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: `conic-gradient(${agent.stats.reputation >= 90 ? "#66BB6A" : "#FFA726"} ${agent.stats.reputation * 3.6}deg, rgba(255,255,255,.04) 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ width: 33, height: 33, borderRadius: "50%", background: "#0A0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: ft.display, fontSize: 13, fontWeight: 700, color: agent.stats.reputation >= 90 ? "#66BB6A" : "#FFA726" }}>{agent.stats.reputation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{agent.description}</p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                    {agent.capabilities.slice(0, mob ? 3 : 4).map((c, i) => <span key={i} style={{ fontFamily: ft.mono, fontSize: 9, padding: "2px 7px", background: "rgba(66,165,245,.04)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 4, color: "rgba(255,255,255,.3)" }}>{c.verb}</span>)}
                    {agent.capabilities.length > (mob ? 3 : 4) && <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>+{agent.capabilities.length - (mob ? 3 : 4)}</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(66,165,245,.04)", paddingTop: 10 }}>
                    {[{ l: "Runs", v: agent.stats.totalRuns.toLocaleString() },{ l: "Success", v: `${agent.stats.successRate}%` },{ l: "Cost", v: agent.stats.avgCost },{ l: "Runtime", v: agent.stats.avgRuntime },{ l: "Active", v: agent.stats.activeContracts }].map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}><div style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700 }}>{s.v}</div><div style={{ fontFamily: ft.mono, fontSize: 7, color: "rgba(255,255,255,.15)", textTransform: "uppercase", marginTop: 1 }}>{s.l}</div></div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", padding: "2px 6px", background: "rgba(255,255,255,.02)", borderRadius: 3 }}>P50: {agent.sla.latencyP50}</span>
                    <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", padding: "2px 6px", background: "rgba(255,255,255,.02)", borderRadius: 3 }}>Max: {agent.sla.maxCost}</span>
                    <span style={{ fontFamily: ft.mono, fontSize: 8, color: agent.evalClaims.every(c => c.pass) ? "rgba(102,187,106,.5)" : "rgba(255,167,38,.5)", padding: "2px 6px", background: "rgba(255,255,255,.02)", borderRadius: 3 }}>{agent.evalClaims.filter(c => c.pass).length}/{agent.evalClaims.length} claims</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {selected && <AgentDetailModal agent={selected} mob={mob} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── LIVE ───
function Live({ mob, tab }) {
  const [sort, setSort] = useState("signal");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  const filtered = statusFilter === "all" ? LIVE_SIGNALS : LIVE_SIGNALS.filter(s => s.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "signal") return b.signal - a.signal;
    if (sort === "rank") return a.rank - b.rank;
    if (sort === "spend") return b.avgSpend - a.avgSpend;
    if (sort === "agents") return b.agents - a.agents;
    if (sort === "impressions") return b.impressions - a.impressions;
    return 0;
  });

  const totalSpend = LIVE_SIGNALS.reduce((s, sig) => s + sig.avgSpend, 0);
  const totalImpressions = LIVE_SIGNALS.reduce((s, sig) => s + sig.impressions, 0);
  const liveCount = LIVE_SIGNALS.filter(s => s.status === "live").length;
  const avgAgents = (LIVE_SIGNALS.reduce((s, sig) => s + sig.agents, 0) / LIVE_SIGNALS.length).toFixed(1);
  const aioVisible = LIVE_SIGNALS.filter(s => s.aioVisible).length;
  const avgCtr = (LIVE_SIGNALS.reduce((s, sig) => s + sig.ctr, 0) / LIVE_SIGNALS.length).toFixed(1);

  const statusColors = { live: "#66BB6A", warming: "#FFA726", cooling: "#78909C" };
  const aioPosColors = { featured: "#42A5F5", cited: "#64B5F6", mentioned: "#90CAF9", none: "rgba(255,255,255,.15)" };

  function RankDelta({ current, prev }) {
    const d = prev - current;
    if (d === 0) return <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>—</span>;
    return <span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 600, color: d > 0 ? "#66BB6A" : "#EF5350" }}>{d > 0 ? "▲" : "▼"}{Math.abs(d)}</span>;
  }

  function PulsingDot({ color }) {
    return <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: pulse ? `0 0 8px ${color}80` : `0 0 3px ${color}40`, transition: "box-shadow .8s ease", flexShrink: 0 }} />;
  }

  const kpis = [
    { label: "Active SMBs", value: liveCount, sub: `of ${LIVE_SIGNALS.length} tracked`, color: "#66BB6A" },
    { label: "Total Spend", value: `$${(totalSpend / 1000).toFixed(1)}k`, sub: "avg monthly", color: blue },
    { label: "Impressions", value: `${(totalImpressions / 1000).toFixed(0)}K`, sub: "this period", color: "#64B5F6" },
    { label: "Avg CTR", value: `${avgCtr}%`, sub: "across signals", color: "#AB47BC" },
    { label: "AIO Visible", value: `${aioVisible}/${LIVE_SIGNALS.length}`, sub: `${Math.round(aioVisible / LIVE_SIGNALS.length * 100)}% coverage`, color: "#90CAF9" },
    { label: "Avg Agents", value: avgAgents, sub: "per demand signal", color: "#FFA726" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: mob ? 14 : 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 22, fontWeight: 700 }}>Live</h2>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "#66BB6A", background: "rgba(102,187,106,.08)", border: "1px solid rgba(102,187,106,.15)", padding: "3px 8px", borderRadius: 100 }}>
              <PulsingDot color="#66BB6A" /> LIVE
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 2 }}>Real-time SMB demand positions, agent spend & competitive landscape</p>
        </div>
        <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)" }}>Auto-refresh · Feb 24, 2025</div>
      </div>

      {/* KPIs */}
      {mob ? (
        <ScrollX>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4, minWidth: "max-content" }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 10, padding: "12px 14px", minWidth: 115 }}>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{k.label}</div>
                <div style={{ fontFamily: ft.display, fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.15)", marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </ScrollX>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: tab ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(66,165,245,.06)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: mob ? 10 : 0, marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)", textTransform: "uppercase", letterSpacing: ".06em" }}>Status:</span>
          {["all", "live", "warming", "cooling"].map(fl => (
            <button key={fl} onClick={() => setStatusFilter(fl)} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, background: statusFilter === fl ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.015)", color: statusFilter === fl ? (fl === "all" ? blue : statusColors[fl] || blue) : "rgba(255,255,255,.25)", border: `1px solid ${statusFilter === fl ? "rgba(66,165,245,.12)" : "rgba(255,255,255,.04)"}`, padding: "4px 10px", borderRadius: 5, cursor: "pointer", textTransform: "capitalize" }}>{fl}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)", textTransform: "uppercase", letterSpacing: ".06em" }}>Sort:</span>
          {[{ k: "signal", l: "Signal" }, { k: "rank", l: "Rank" }, { k: "spend", l: "Spend" }, { k: "agents", l: "Agents" }, { k: "impressions", l: "Impr." }].map(s => (
            <button key={s.k} onClick={() => setSort(s.k)} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, background: sort === s.k ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.015)", color: sort === s.k ? blue : "rgba(255,255,255,.25)", border: `1px solid ${sort === s.k ? "rgba(66,165,245,.12)" : "rgba(255,255,255,.04)"}`, padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* Signal Feed */}
      {mob ? (
        <div style={{ display: "grid", gap: 8 }}>
          {sorted.map(sig => (
            <div key={sig.id} onClick={() => setExpanded(expanded === sig.id ? null : sig.id)} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${expanded === sig.id ? "rgba(66,165,245,.15)" : "rgba(66,165,245,.06)"}`, borderRadius: 12, padding: 14, cursor: "pointer", transition: "border-color .2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <PulsingDot color={statusColors[sig.status]} />
                <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: "#E3F2FD", minWidth: 22 }}>#{sig.rank}</div>
                <RankDelta current={sig.rank} prev={sig.prevRank} />
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 700, color: sig.signal >= 85 ? "#66BB6A" : sig.signal >= 60 ? "#FFA726" : "rgba(255,255,255,.35)" }}>{sig.signal}</div>
                  <div style={{ fontFamily: ft.mono, fontSize: 7, color: "rgba(255,255,255,.15)", textTransform: "uppercase" }}>Signal</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.query}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <VBadge v={sig.vertical} />
                <Badge color={aioPosColors[sig.aioPos]} bg={`${aioPosColors[sig.aioPos]}15`}>{sig.aioPos === "none" ? "No AIO" : `AIO: ${sig.aioPos}`}</Badge>
                <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", marginLeft: "auto" }}>{sig.lastUpdate}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Avg Spend</div><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 700, color: blue }}>${sig.avgSpend.toLocaleString()}</div></div>
                <div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Agents</div><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 700 }}>{sig.agents}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>CTR</div><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 700, color: "#AB47BC" }}>{sig.ctr}%</div></div>
              </div>
              {expanded === sig.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Top Bid</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600, color: "#FFA726" }}>${sig.topBid.toLocaleString()}</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Impressions</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600 }}>{(sig.impressions / 1000).toFixed(1)}K</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Clicks</span><div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 600 }}>{sig.clicks.toLocaleString()}</div></div>
                    <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Category</span><div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>{sig.category}</div></div>
                  </div>
                  <div><span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>7-Day Spend Trend</span></div>
                  <div style={{ marginTop: 6 }}><Sparkline data={sig.spend7d} width={200} height={28} color={blue} /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card mob={mob} style={{ padding: 0, overflow: "hidden" }}>
          <ScrollX>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(66,165,245,.06)" }}>
                {["","Rank","SMB Demand Signal","Vertical","AIO Position","Signal","Avg Spend","Top Bid","Agents","Impressions","CTR","7d Trend","Updated"].map(h => (
                  <th key={h} style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: ".06em", padding: "12px 8px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{sorted.map(sig => (
                <tr key={sig.id} style={{ borderBottom: "1px solid rgba(255,255,255,.02)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(66,165,245,.015)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 8px", width: 20 }}><PulsingDot color={statusColors[sig.status]} /></td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: ft.display, fontSize: 17, fontWeight: 700, color: "#E3F2FD" }}>#{sig.rank}</span>
                      <RankDelta current={sig.rank} prev={sig.prevRank} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 8px", maxWidth: 220 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.query}</div>
                    <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", marginTop: 2 }}>{sig.category} · {sig.id}</div>
                  </td>
                  <td style={{ padding: "12px 8px" }}><VBadge v={sig.vertical} /></td>
                  <td style={{ padding: "12px 8px" }}>
                    <Badge color={aioPosColors[sig.aioPos]} bg={`${aioPosColors[sig.aioPos]}15`}>{sig.aioPos === "none" ? "—" : sig.aioPos}</Badge>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: sig.signal >= 85 ? "rgba(102,187,106,.1)" : sig.signal >= 60 ? "rgba(255,167,38,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${sig.signal >= 85 ? "rgba(102,187,106,.18)" : sig.signal >= 60 ? "rgba(255,167,38,.12)" : "rgba(255,255,255,.05)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ft.display, fontSize: 15, fontWeight: 700, color: sig.signal >= 85 ? "#66BB6A" : sig.signal >= 60 ? "#FFA726" : "rgba(255,255,255,.35)" }}>{sig.signal}</div>
                  </td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: blue, padding: "12px 8px", whiteSpace: "nowrap" }}>${sig.avgSpend.toLocaleString()}<span style={{ fontSize: 9, color: "rgba(255,255,255,.15)" }}>/mo</span></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#FFA726", padding: "12px 8px", whiteSpace: "nowrap" }}>${sig.topBid.toLocaleString()}</td>
                  <td style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, padding: "12px 8px", textAlign: "center" }}>{sig.agents}</td>
                  <td style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.4)", padding: "12px 8px", whiteSpace: "nowrap" }}>{(sig.impressions / 1000).toFixed(1)}K</td>
                  <td style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 600, color: "#AB47BC", padding: "12px 8px" }}>{sig.ctr}%</td>
                  <td style={{ padding: "12px 8px" }}><Sparkline data={sig.spend7d} width={56} height={22} color={sig.spend7d[6] >= sig.spend7d[0] ? "#66BB6A" : "#EF5350"} /></td>
                  <td style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", padding: "12px 8px", whiteSpace: "nowrap" }}>{sig.lastUpdate}</td>
                </tr>
              ))}</tbody>
            </table>
          </ScrollX>
        </Card>
      )}

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 10 : 16, marginTop: mob ? 10 : 20 }}>
        <Card mob={mob}>
          <h3 style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Top Spend Signals</h3>
          {[...LIVE_SIGNALS].sort((a, b) => b.avgSpend - a.avgSpend).slice(0, 5).map((sig, i) => (
            <div key={sig.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.025)" }}>
              <span style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.12)", width: 16 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.query}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}><VBadge v={sig.vertical} /></div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: ft.mono, fontSize: 13, fontWeight: 700, color: blue }}>${sig.avgSpend.toLocaleString()}</div>
                <div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.15)" }}>{sig.agents} agents</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── ESCROW ───
function Escrow({ mob }) {
  const list = MOCK_INTENTS.filter(i => ["engaged", "milestone", "completed"].includes(i.status));
  return (
    <div>
      <h2 style={{ fontFamily: ft.display, fontSize: mob ? 20 : 22, fontWeight: 700, marginBottom: 6 }}>Escrow</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)", marginBottom: mob ? 16 : 24 }}>Funds held until milestone verification.</p>
      <div style={{ display: "grid", gap: mob ? 10 : 12 }}>
        {list.map(intent => {
          const st = STATUS_CFG[intent.status];
          const prog = intent.status === "completed" ? 100 : intent.status === "milestone" ? 55 : 15;
          return (
            <Card key={intent.id} mob={mob}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}><span style={{ fontSize: mob ? 14 : 15, fontWeight: 700 }}>{intent.business}</span><VBadge v={intent.vertical} /><Badge color={st.color} bg={st.bg}>{st.label}</Badge></div>
                  <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.22)" }}>Agent: {intent.agent} · {intent.id}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontFamily: ft.mono, fontSize: mob ? 14 : 16, fontWeight: 700, color: blue }}>{intent.budget}</div><div style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.18)", textTransform: "uppercase" }}>Escrow</div></div>
              </div>
              {intent.milestone && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", background: "rgba(100,181,246,.03)", border: "1px solid rgba(100,181,246,.07)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}><span style={{ fontFamily: ft.mono, fontSize: 8, color: "#64B5F6", textTransform: "uppercase", letterSpacing: ".06em" }}>Milestone: </span>{intent.milestone}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.04)" }}><div style={{ width: `${prog}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${blueDeep}, ${blue})` }} /></div>
                <span style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.3)" }}>{prog}%</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP SHELL ───
export default function MarketplaceApp() {
  const { mob, tab } = useMedia();
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { key: "dashboard", icon: "◎", label: "Dashboard" },
    { key: "intents", icon: "◉", label: "Market" },
    { key: "auctions", icon: "⚡", label: "Live" },
    { key: "agents", icon: "⬡", label: "Registry" },
    { key: "escrow", icon: "◈", label: "Escrow" },
  ];

  const go = useCallback((p) => { setPage(p); setMenuOpen(false); }, []);

  const pages = {
    dashboard: <Dashboard mob={mob} tab={tab} />,
    intents: <Intents mob={mob} tab={tab} />,
    agents: <Agents mob={mob} tab={tab} />,
    auctions: <Live mob={mob} tab={tab} />,
    escrow: <Escrow mob={mob} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: mob ? "column" : "row", height: "100vh", background: bgColor, color: "#E3F2FD", fontFamily: ft.sans, overflow: "hidden", position: "relative" }}>
      {/* Global styles now in index.html */}

      {/* ─── MOBILE TOP BAR ─── */}
      {mob && (
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(66,165,245,.06)", flexShrink: 0, background: "rgba(7,11,20,.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 32 32" width="16" height="16" fill="none"><path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85"/><path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6"/></svg>
            </div>
            <span style={{ fontFamily: ft.display, fontWeight: 700, fontSize: 15 }}>agentic<span style={{ color: blue }}>proxies</span></span>
            <Badge color="rgba(255,255,255,.25)" bg="rgba(66,165,245,.06)">MVP</Badge>
          </div>
          <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,.35)" strokeWidth="2"/><path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}

      {/* ─── DESKTOP SIDEBAR ─── */}
      {!mob && (
        <div style={{ width: tab ? 200 : 240, borderRight: "1px solid rgba(66,165,245,.06)", display: "flex", flexDirection: "column", background: "rgba(255,255,255,.006)", flexShrink: 0 }}>
          <div style={{ padding: "18px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(66,165,245,.06)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, boxShadow: "0 0 10px rgba(33,150,243,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 32 32" width="18" height="18" fill="none"><path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85"/><path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6"/></svg>
            </div>
            <span style={{ fontFamily: ft.display, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>agentic<span style={{ color: blue }}>proxies</span></span>
            <Badge color="rgba(255,255,255,.25)" bg="rgba(66,165,245,.06)">MVP</Badge>
          </div>
          <div style={{ padding: "10px 0", flex: 1, overflowY: "auto" }}>
            <div style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.12)", letterSpacing: ".15em", textTransform: "uppercase", padding: "8px 14px" }}>Platform</div>
            {navItems.slice(0, 3).map(n => (
              <button key={n.key} onClick={() => go(n.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: (page === n.key) ? "rgba(66,165,245,.06)" : "transparent", border: "none", borderLeft: (page === n.key) ? `2px solid ${blue}` : "2px solid transparent", color: (page === n.key) ? "#E3F2FD" : "rgba(227,242,253,.35)", cursor: "pointer", fontFamily: ft.sans, fontSize: 13, fontWeight: 500, width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>{n.label}
              </button>
            ))}
            <div style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.12)", letterSpacing: ".15em", textTransform: "uppercase", padding: "14px 14px 8px" }}>Network</div>
            {navItems.slice(3).map(n => (
              <button key={n.key} onClick={() => go(n.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: page === n.key ? "rgba(66,165,245,.06)" : "transparent", border: "none", borderLeft: page === n.key ? `2px solid ${blue}` : "2px solid transparent", color: page === n.key ? "#E3F2FD" : "rgba(227,242,253,.35)", cursor: "pointer", fontFamily: ft.sans, fontSize: 13, fontWeight: 500, width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(66,165,245,.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,.35)" strokeWidth="2"/><path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: ft.sans, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Operator</div>
              <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.12)" }}>admin@agenticproxies.com</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, cursor: "pointer" }}><path d="M12 13a1 1 0 100-2 1 1 0 000 2zm0-5a1 1 0 100-2 1 1 0 000 2zm0 10a1 1 0 100-2 1 1 0 000 2z" fill="rgba(255,255,255,.2)"/></svg>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {!mob && (
          <div style={{ height: 52, borderBottom: "1px solid rgba(66,165,245,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
            <span style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700 }}>{navItems.find(n => n.key === page)?.label || page}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.18)" }}>agenticproxies.com</div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: blue, boxShadow: `0 0 8px rgba(66,165,245,.4)` }} />
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,.06)", margin: "0 4px" }} />
              <button style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,.35)" strokeWidth="2"/><path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: mob ? 16 : tab ? 20 : 28, paddingBottom: mob ? 80 : 28 }}>
          {pages[page]}
        </div>
      </div>

      {/* ─── MOBILE BOTTOM TAB BAR ─── */}
      {mob && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "rgba(7,11,20,.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(66,165,245,.08)", display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 50, paddingBottom: 4 }}>
          {navItems.map(n => {
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => go(n.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", minWidth: 52 }}>
                <span style={{ fontSize: 18, color: active ? blue : "rgba(227,242,253,.25)", transition: "color .2s", lineHeight: 1 }}>{n.icon}</span>
                <span style={{ fontFamily: ft.mono, fontSize: 9, fontWeight: 600, color: active ? blue : "rgba(227,242,253,.2)", letterSpacing: ".02em" }}>{n.label.length > 7 ? n.label.slice(0, 6) + "…" : n.label}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: 2, background: blue, marginTop: 1 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
