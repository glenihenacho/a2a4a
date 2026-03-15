// ─── DEMO DATA (extracted from seed.js for auto-seeding on startup) ───
// This module is dynamically imported by server/index.js when the DB is empty.

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

const MOCK_AGENTS = [
  {
    id: "agt-001", name: "RankForge", avatar: "RF", version: "2.4.1", verified: true,
    signedAt: "2025-02-18T09:14:00Z", status: "live", verticals: ["SEO"],
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
    totalRuns: 342, successRate: 94.7, avgRuntime: "18m", avgCost: "$142", activeContracts: 12, reputation: 92, monthlyRev: 4200, wins: 28,
  },
  {
    id: "agt-002", name: "OverviewFirst", avatar: "OF", version: "3.1.0", verified: true,
    signedAt: "2025-02-20T11:30:00Z", status: "live", verticals: ["AIO"],
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
    totalRuns: 186, successRate: 91.4, avgRuntime: "32m", avgCost: "$198", activeContracts: 8, reputation: 94, monthlyRev: 3100, wins: 15,
  },
  {
    id: "agt-003", name: "Linksmith AI", avatar: "LS", version: "1.8.3", verified: true,
    signedAt: "2025-02-15T14:22:00Z", status: "live", verticals: ["SEO"],
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
    totalRuns: 520, successRate: 88.3, avgRuntime: "2.1h", avgCost: "$312", activeContracts: 18, reputation: 89, monthlyRev: 2800, wins: 41,
  },
  {
    id: "agt-004", name: "SerpAgent", avatar: "SA", version: "2.0.0", verified: false,
    signedAt: null, status: "evaluation", verticals: ["SEO"],
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
    totalRuns: 87, successRate: 79.3, avgRuntime: "24m", avgCost: "$165", activeContracts: 0, reputation: 0, monthlyRev: 1900, wins: 19,
  },
  {
    id: "agt-005", name: "ContentMesh", avatar: "CM", version: "1.5.2", verified: true,
    signedAt: "2025-02-19T08:45:00Z", status: "live", verticals: ["AIO"],
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
    totalRuns: 214, successRate: 96.3, avgRuntime: "14m", avgCost: "$118", activeContracts: 9, reputation: 91, monthlyRev: 2100, wins: 10,
  },
  {
    id: "agt-006", name: "TechSEO Pro", avatar: "TP", version: "4.0.1", verified: true,
    signedAt: "2025-02-22T16:08:00Z", status: "live", verticals: ["SEO", "AIO"],
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
    totalRuns: 610, successRate: 97.2, avgRuntime: "2.8h", avgCost: "$520", activeContracts: 22, reputation: 96, monthlyRev: 5400, wins: 53,
  },
];

const MOCK_INTENTS = [
  { id: "INT-001", business: "Bloom Botanicals", vertical: "AIO", status: "bidding", queries: "skincare brand not in AI results", url: "bloombotanicals.com", bids: 4, created: "2025-02-20", budget: "$2,400/mo" },
  { id: "INT-002", business: "FastTrack Logistics", vertical: "SEO", status: "engaged", queries: "delivery service invisible on Google", url: "fasttracklogistics.com", bids: 3, created: "2025-02-18", budget: "$1,800/mo", agent: "TechSEO Pro" },
  { id: "INT-003", business: "MindfulApp", vertical: "AIO", status: "bidding", queries: "wellness app lost to AI overview competitors", url: "mindfulapp.io", bids: 2, created: "2025-02-21", budget: "$1,200/mo" },
  { id: "INT-004", business: "ClearView Solar", vertical: "AIO", status: "milestone", queries: "solar installer needs AI search visibility", url: "clearviewsolar.co", bids: 5, created: "2025-02-12", budget: "$3,600/mo", agent: "RankForge", milestone: "AIO appearance confirmed for 2/5 target queries" },
  { id: "INT-005", business: "PetPals Vet", vertical: "AIO", status: "completed", queries: "vet clinic missing from AI answers", url: "petpalsvet.com", bids: 3, created: "2025-01-28", budget: "$900/mo", agent: "OverviewFirst" },
  { id: "INT-006", business: "NovaBrew Coffee", vertical: "SEO", status: "bidding", queries: "coffee brand not ranking for subscriptions", url: "novabrew.com", bids: 1, created: "2025-02-22", budget: "$1,500/mo" },
];

const SLA_TEMPLATES = [
  { id: "seo-1", vertical: "SEO", name: "Technical Audit & Fix", desc: "Full site audit, Core Web Vitals, crawlability", timeline: "4 wk", metric: "90+ Lighthouse" },
  { id: "seo-2", vertical: "SEO", name: "Keyword Ranking", desc: "Target keywords into top 10 positions", timeline: "8–12 wk", metric: "≥5 in top 10" },
  { id: "seo-3", vertical: "SEO", name: "Revenue Share", desc: "% of incremental organic revenue", timeline: "Ongoing", metric: "Analytics attribution" },
  { id: "aio-1", vertical: "AIO", name: "Content Restructuring", desc: "Rewrite for AI-friendly extraction", timeline: "3–6 wk", metric: "AIO readiness ✓" },
  { id: "aio-2", vertical: "AIO", name: "Structured Data", desc: "Schema markup for target pages", timeline: "2–4 wk", metric: "100% valid schema" },
  { id: "aio-3", vertical: "AIO", name: "AIO Appearance", desc: "Appear in AI Overviews for target queries", timeline: "8–16 wk", metric: "≥3 queries" },
];

const INTENT_MARKET = [
  { id: 1, query: "my skincare brand doesn't show in AI answers", vol: 74000, volTrend: [31, 38, 42, 51, 58, 67, 74], aioRate: 82, ctr: 12, ctrDelta: -28, competition: 87, category: "Beauty & Wellness", opportunity: 91, vertical: "AIO", aioCited: 4, avgPos: 3.2 },
  { id: 2, query: "delivery company not ranking locally", vol: 165000, volTrend: [90, 102, 118, 130, 142, 155, 165], aioRate: 71, ctr: 18, ctrDelta: -22, competition: 93, category: "Logistics & Transport", opportunity: 68, vertical: "SEO", aioCited: 6, avgPos: 2.1 },
  { id: 3, query: "solar installer needs AI overview placement", vol: 52000, volTrend: [22, 28, 31, 36, 40, 47, 52], aioRate: 94, ctr: 8, ctrDelta: -41, competition: 62, category: "Home Services", opportunity: 95, vertical: "AIO", aioCited: 3, avgPos: 4.8 },
  { id: 4, query: "health app losing traffic to AI summaries", vol: 41000, volTrend: [18, 22, 25, 29, 34, 38, 41], aioRate: 88, ctr: 14, ctrDelta: -31, competition: 71, category: "Health & Fitness", opportunity: 84, vertical: "AIO", aioCited: 5, avgPos: 2.7 },
  { id: 5, query: "coffee subscription brand invisible on Google", vol: 33000, volTrend: [15, 18, 21, 24, 27, 30, 33], aioRate: 45, ctr: 32, ctrDelta: -8, competition: 78, category: "Food & Beverage", opportunity: 56, vertical: "SEO", aioCited: 2, avgPos: 5.4 },
  { id: 6, query: "veterinary clinic missing from emergency search", vol: 128000, volTrend: [70, 82, 90, 98, 108, 118, 128], aioRate: 76, ctr: 22, ctrDelta: -19, competition: 55, category: "Pet Services", opportunity: 79, vertical: "AIO", aioCited: 4, avgPos: 1.9 },
  { id: 7, query: "SaaS startup needs to rank for CRM searches", vol: 89000, volTrend: [45, 52, 60, 68, 74, 82, 89], aioRate: 91, ctr: 10, ctrDelta: -35, competition: 96, category: "SaaS & Tech", opportunity: 72, vertical: "AIO", aioCited: 7, avgPos: 3.5 },
  { id: 8, query: "energy company wants AI overview citations", vol: 97000, volTrend: [40, 48, 55, 64, 75, 86, 97], aioRate: 86, ctr: 11, ctrDelta: -33, competition: 44, category: "Home Services", opportunity: 93, vertical: "AIO", aioCited: 5, avgPos: 4.1 },
  { id: 9, query: "marketing agency can't rank its own site", vol: 28000, volTrend: [12, 15, 17, 20, 22, 25, 28], aioRate: 38, ctr: 36, ctrDelta: -5, competition: 82, category: "Professional Services", opportunity: 48, vertical: "SEO", aioCited: 1, avgPos: 6.2 },
  { id: 10, query: "AI writing tool buried by competitor overviews", vol: 112000, volTrend: [30, 42, 55, 70, 85, 98, 112], aioRate: 93, ctr: 9, ctrDelta: -38, competition: 89, category: "SaaS & Tech", opportunity: 88, vertical: "AIO", aioCited: 8, avgPos: 2.4 },
  { id: 11, query: "restaurant needs POS system review visibility", vol: 47000, volTrend: [25, 28, 32, 36, 39, 43, 47], aioRate: 79, ctr: 15, ctrDelta: -24, competition: 68, category: "Food & Beverage", opportunity: 76, vertical: "SEO", aioCited: 4, avgPos: 3.8 },
  { id: 12, query: "law firm losing leads to competitors on search", vol: 210000, volTrend: [150, 162, 170, 182, 192, 200, 210], aioRate: 64, ctr: 25, ctrDelta: -14, competition: 98, category: "Legal", opportunity: 62, vertical: "SEO", aioCited: 3, avgPos: 2.0 },
];

const LIVE_SIGNALS = [
  { id: "SIG-001", query: "skincare brand not in AI answers", vertical: "AIO", status: "live", rank: 2, prevRank: 4, aioPos: "cited", avgSpend: 1840, topBid: 2400, agents: 5, impressions: 12400, clicks: 1488, ctr: 12.0, aioVisible: true, lastUpdate: "12s ago", spend7d: [1200, 1400, 1600, 1750, 1800, 1820, 1840], category: "Beauty & Wellness", signal: 94 },
  { id: "SIG-002", query: "delivery company not ranking locally", vertical: "SEO", status: "live", rank: 1, prevRank: 1, aioPos: "featured", avgSpend: 3200, topBid: 4100, agents: 8, impressions: 38200, clicks: 6876, ctr: 18.0, aioVisible: true, lastUpdate: "4s ago", spend7d: [2800, 2900, 3000, 3050, 3100, 3150, 3200], category: "Logistics & Transport", signal: 98 },
  { id: "SIG-003", query: "solar installer needs AI overview placement", vertical: "AIO", status: "live", rank: 5, prevRank: 8, aioPos: "cited", avgSpend: 980, topBid: 1500, agents: 3, impressions: 8900, clicks: 712, ctr: 8.0, aioVisible: true, lastUpdate: "28s ago", spend7d: [600, 680, 750, 820, 880, 940, 980], category: "Home Services", signal: 87 },
  { id: "SIG-004", query: "health app losing traffic to AI summaries", vertical: "AIO", status: "live", rank: 3, prevRank: 5, aioPos: "mentioned", avgSpend: 1100, topBid: 1600, agents: 4, impressions: 7200, clicks: 1008, ctr: 14.0, aioVisible: true, lastUpdate: "8s ago", spend7d: [700, 800, 850, 920, 980, 1050, 1100], category: "Health & Fitness", signal: 82 },
  { id: "SIG-005", query: "coffee brand invisible on Google", vertical: "SEO", status: "live", rank: 7, prevRank: 6, aioPos: "none", avgSpend: 720, topBid: 1100, agents: 2, impressions: 5600, clicks: 1792, ctr: 32.0, aioVisible: false, lastUpdate: "45s ago", spend7d: [500, 540, 580, 620, 660, 690, 720], category: "Food & Beverage", signal: 61 },
  { id: "SIG-006", query: "vet clinic missing from emergency search", vertical: "AIO", status: "live", rank: 2, prevRank: 3, aioPos: "featured", avgSpend: 2600, topBid: 3400, agents: 6, impressions: 22100, clicks: 4862, ctr: 22.0, aioVisible: true, lastUpdate: "2s ago", spend7d: [2000, 2100, 2250, 2350, 2450, 2520, 2600], category: "Pet Services", signal: 91 },
  { id: "SIG-007", query: "SaaS startup needs CRM search ranking", vertical: "AIO", status: "live", rank: 4, prevRank: 4, aioPos: "cited", avgSpend: 2100, topBid: 2900, agents: 7, impressions: 15800, clicks: 1580, ctr: 10.0, aioVisible: true, lastUpdate: "16s ago", spend7d: [1600, 1700, 1800, 1880, 1950, 2030, 2100], category: "SaaS & Tech", signal: 89 },
  { id: "SIG-008", query: "energy company wants AI overview citations", vertical: "AIO", status: "warming", rank: 6, prevRank: 9, aioPos: "cited", avgSpend: 860, topBid: 1200, agents: 3, impressions: 14200, clicks: 1562, ctr: 11.0, aioVisible: true, lastUpdate: "1m ago", spend7d: [400, 480, 560, 640, 720, 790, 860], category: "Home Services", signal: 85 },
  { id: "SIG-009", query: "AI writing tool buried by competitor overviews", vertical: "AIO", status: "live", rank: 3, prevRank: 7, aioPos: "featured", avgSpend: 2850, topBid: 3800, agents: 9, impressions: 19600, clicks: 1764, ctr: 9.0, aioVisible: true, lastUpdate: "6s ago", spend7d: [1800, 2000, 2200, 2400, 2550, 2700, 2850], category: "SaaS & Tech", signal: 96 },
  { id: "SIG-010", query: "law firm losing leads to competitors", vertical: "SEO", status: "live", rank: 1, prevRank: 1, aioPos: "none", avgSpend: 4800, topBid: 6200, agents: 11, impressions: 42000, clicks: 10500, ctr: 25.0, aioVisible: false, lastUpdate: "1s ago", spend7d: [4200, 4350, 4450, 4550, 4650, 4720, 4800], category: "Legal", signal: 99 },
  { id: "SIG-011", query: "restaurant needs POS review visibility", vertical: "SEO", status: "warming", rank: 8, prevRank: 11, aioPos: "mentioned", avgSpend: 640, topBid: 900, agents: 2, impressions: 6100, clicks: 915, ctr: 15.0, aioVisible: true, lastUpdate: "2m ago", spend7d: [320, 380, 440, 500, 550, 590, 640], category: "Food & Beverage", signal: 72 },
  { id: "SIG-012", query: "marketing agency can't rank own site", vertical: "SEO", status: "cooling", rank: 12, prevRank: 10, aioPos: "none", avgSpend: 380, topBid: 550, agents: 1, impressions: 3800, clicks: 1368, ctr: 36.0, aioVisible: false, lastUpdate: "5m ago", spend7d: [520, 500, 480, 460, 430, 400, 380], category: "Professional Services", signal: 41 },
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

const MOCK_JOBS = [
  { id: "JOB-001", intentId: "INT-002", agentId: "agt-006", status: "executing", vertical: "SEO", slaTemplateId: "seo-1", budgetCents: 180000, milestonesTotal: 4, milestonesHit: 1, slaTarget: 90, startedAt: "2025-02-19T10:00:00Z" },
  { id: "JOB-002", intentId: "INT-004", agentId: "agt-001", status: "executing", vertical: "AIO", slaTemplateId: "aio-3", budgetCents: 360000, milestonesTotal: 5, milestonesHit: 2, slaTarget: 60, slaAchieved: 40, startedAt: "2025-02-13T08:00:00Z" },
  { id: "JOB-003", intentId: "INT-005", agentId: "agt-002", status: "completed", vertical: "AIO", slaTemplateId: "aio-1", budgetCents: 90000, costActualCents: 82800, milestonesTotal: 3, milestonesHit: 3, slaTarget: 85, slaAchieved: 92, slaReport: { target: "AIO readiness", achieved: "92% coverage", pass: true }, artifacts: [{ type: "report", name: "AIO Audit Report.pdf", size: "2.4 MB" }, { type: "schema", name: "structured-data.json", size: "18 KB" }], startedAt: "2025-01-29T09:00:00Z", completedAt: "2025-02-14T16:30:00Z" },
];

const MOCK_ESCROW = [
  { id: "ESC-001", jobId: "JOB-001", state: "locked", amountCents: 180000, currency: "USD", platformFeeCents: 0, stripePaymentIntentId: "pi_sim_001", lockedAt: "2025-02-19T10:00:00Z" },
  { id: "ESC-002", jobId: "JOB-002", state: "locked", amountCents: 360000, currency: "USD", platformFeeCents: 0, stripePaymentIntentId: "pi_sim_002", lockedAt: "2025-02-13T08:00:00Z" },
  { id: "ESC-003", jobId: "JOB-003", state: "released", amountCents: 90000, currency: "USD", platformFeeCents: 7200, agentPayoutCents: 82800, stripePaymentIntentId: "pi_sim_003", stripeTransferId: "tr_sim_003", lockedAt: "2025-01-29T09:00:00Z", releasedAt: "2025-02-14T16:30:00Z" },
];

// ─── SEED FUNCTION (non-destructive, inserts only) ───

export async function seedDemoData(db, schema) {
  await db.insert(schema.revenueMonths).values(REVENUE_MONTHS);

  for (const a of MOCK_AGENTS) {
    await db.insert(schema.agents).values({
      id: a.id, name: a.name, avatar: a.avatar, version: a.version, verified: a.verified,
      signedAt: a.signedAt ? new Date(a.signedAt) : null,
      status: a.status, verticals: a.verticals, description: a.description,
      capabilities: a.capabilities, inputSchema: a.inputSchema, outputSchema: a.outputSchema,
      toolRequirements: a.toolRequirements, sla: a.sla, policy: a.policy, evalClaims: a.evalClaims,
      totalRuns: a.totalRuns, successRate: a.successRate, avgRuntime: a.avgRuntime, avgCost: a.avgCost,
      activeContracts: a.activeContracts, reputation: a.reputation, monthlyRev: a.monthlyRev, wins: a.wins,
    });
  }

  await db.insert(schema.intents).values(MOCK_INTENTS);
  await db.insert(schema.transactions).values(TRANSACTIONS);
  await db.insert(schema.slaTemplates).values(SLA_TEMPLATES);
  await db.insert(schema.intentMarket).values(INTENT_MARKET);
  await db.insert(schema.signals).values(LIVE_SIGNALS);
  await db.insert(schema.intentCategories).values(INTENT_CATEGORIES);

  for (const j of MOCK_JOBS) {
    await db.insert(schema.jobs).values({
      ...j,
      startedAt: j.startedAt ? new Date(j.startedAt) : null,
      completedAt: j.completedAt ? new Date(j.completedAt) : null,
    });
  }

  for (const e of MOCK_ESCROW) {
    await db.insert(schema.escrow).values({
      ...e,
      lockedAt: e.lockedAt ? new Date(e.lockedAt) : null,
      releasedAt: e.releasedAt ? new Date(e.releasedAt) : null,
    });
  }
}
