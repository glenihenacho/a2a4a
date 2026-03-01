# CLAUDE.md — AgenticProxies (A2A Protocol)

## What This Project Is

AgenticProxies is a **dual-vertical AI agent marketplace** connecting SMBs (small-to-medium businesses) with autonomous AI agents that perform **SEO** and **AI Overview (AIO)** optimization. The platform operates on the **A2A Protocol** (Agent-to-Agent), an escrow-protected, SLA-enforced job execution framework where agents compete on performance and get paid on delivery.

**Two-sided marketplace:**
- **Demand side** — SMBs submit optimization requests (intents) with budgets
- **Supply side** — AI agents (deployed as Docker containers) bid on jobs and execute autonomously

**Settlement model:** Funds are locked in escrow before execution. Agents that hit SLA targets get instant release; misses trigger auto-computed partial refunds.

---

## Repository Structure

```
a2a4a/
├── CLAUDE.md          # This file — project context and conventions
├── mvp.jsx            # Core marketplace platform (dashboard, market, live, registry, escrow)
├── demand.jsx         # Demand-side conversational interface for SMBs
├── waitlist.jsx       # Supply-side agent builder waitlist and onboarding
└── vision.jsx         # Product roadmap and vision (3-phase rollout)
```

All files are **self-contained React components** designed to be served individually or composed into a larger app. There is no build tooling, package.json, or bundler config in the repo — these are pure `.jsx` modules.

---

## File-by-File Breakdown

### `mvp.jsx` — Core Marketplace Platform

The largest file (~186KB). Contains the operational hub with 5 tabbed pages, all mock data, chart primitives, and the full agent registry.

**Navigation tabs (in order):**
1. **Dashboard** (`"dashboard"`, icon `◎`) — Revenue metrics, bar/donut charts, transaction history, top agents, vertical split (SEO 55% / AIO 45%)
2. **Market** (`"intents"`, icon `◉`) — SMB demand signals with search volume, AIO rates, CTR impact, industry categories, intent detail drill-down, budget activation
3. **Live** (`"auctions"`, icon `⚡`) — Real-time signal feed with rank, spend, impressions, AIO visibility, agent count, 7-day spend sparklines, status filters (live/warming/cooling)
4. **Registry** (`"agents"`, icon `⬡`) — Agent cards with reputation gauges, capabilities, eval claims, stats, SLA metrics; agent detail modal; new agent onboarding flow (10-phase scan pipeline)
5. **Escrow** (`"escrow"`, icon `◈`) — Filterable intent list showing escrow status, milestone progress, fund lockup/release tracking

**Key data structures:**
- `REVENUE_MONTHS` — Monthly platform revenue (Sep–Feb, $4.2K–$16.7K)
- `TRANSACTIONS` — 8 sample transaction records (clearing fees, milestones, refunds) in USDC/USD
- `PERF_METRICS` — KPIs by vertical (SEO: 74% milestone success, AIO: 61%)
- `MOCK_AGENTS` — 6 agent profiles (RankForge, OverviewFirst, Linksmith AI, SerpAgent, ContentMesh, TechSEO Pro) with full specs: capabilities, I/O schemas, tool requirements, SLA params, policy, eval claims, stats
- `MOCK_INTENTS` — 6 client job requests at various stages (bidding, engaged, milestone, completed)
- `SLA_TEMPLATES` — Pre-defined SLA types per vertical (Technical Audit, Keyword Ranking, Content Restructuring, AIO Appearance, etc.)
- `INTENT_MARKET` — 12 trending SMB pain points with volume, AIO rate, CTR delta, competition scores
- `INTENT_CATEGORIES` — 9 industry verticals (SaaS, Home Services, Legal, etc.)
- `SCAN_PHASES` — 10-phase agent onboarding pipeline (pull → inspect → manifest → capabilities → schemas → tools → SLA → policy → eval → wrap)
- `PIPELINE_STAGES` — 7-step high-level onboarding funnel
- `WRAPPER_SPEC` — A2A Protocol wrapper specification (input fields, output fields, 6 responsibilities)
- `LIVE_SIGNALS` — 12 real-time auction signals with rank, spend, impressions, CTR, AIO position, agent counts
- `TRENDING_UP` — Top 5 trending queries by volume growth

**UI primitives defined here:**
- `Badge`, `VBadge` — Status/tag indicators
- `ScoreBar` — Horizontal progress bar
- `Card` — Reusable card container
- `ScrollX` — Horizontal scroll wrapper
- `Sparkline` — Mini SVG line chart
- `BarChart` — Multi-series bar chart with legend
- `DonutChart` — Pie/donut segment visualization

**Page components:**
- `Dashboard({ mob, tab })` — Lines ~419–611
- `Intents({ mob, tab })` — Lines ~614–1487
- `Agents({ mob, tab })` — Lines ~1489–1680
- `Live({ mob, tab })` — Lines ~1683–1894
- `Escrow({ mob })` — Lines ~1896–1926
- `App()` (main, `export default`) — Lines ~1929–2051

### `demand.jsx` — Demand-Side Conversational Interface

A chat-based UI where SMBs describe their needs in natural language and get matched with agents.

**Flow phases:** intro → gathering → matching → costing → executing → complete

**Scripted conversation demo:** A bakery wants local SEO + AIO ranking. The system extracts intent, matches agents, shows cost breakdown ($504 for TechSEO Pro), demonstrates execution monitoring through 6 stages, delivers artifacts, and releases escrow funds.

**Generative UI components:**
- `TypingIndicator` — Animated loading dots
- `IntentCard` — Displays extracted business intent/requirements
- `AgentMatchCard` — Shows matched agents with selection capability and reputation gauges
- `CostBreakdown` — Line-item cost estimate with escrow note
- `EscrowCard` — Escrow status indicator (pending/locked/released)
- `ExecutionProgress` — Multi-stage job execution tracker (6 stages with checkmarks and progress)
- `ArtifactCard` — Delivered work products (PDFs, JSON-LD, HTML diffs, etc.)
- `MetricDelta` — Results summary with positive/negative metric deltas
- `QuickActions` — Button groups for user interactions
- `JobSpecPreview` — Job specification rendered in protocol format (terminal-style)

**Main component:** `DemandChat` — Script-driven conversation triggered by regex matching on keywords ("ranking", "bakery", "cost", "approve")

**Mirrors agents from supply side:** `AGENTS` array references the same 5 agent profiles (RankForge, OverviewFirst, Linksmith AI, ContentMesh, TechSEO Pro)

### `waitlist.jsx` — Supply-Side Agent Builder Waitlist

Marketing/onboarding landing page targeting agent builders who want to monetize their AI agents.

**Key sections:**
- **Hero** — "Your agent already works. Now let it earn." with 142 SMBs stat
- **Live demand feed** — 12 rotating SMB demand items across industries
- **Agent economics** — Revenue projections (5 clients = $4,700/mo, 15 = $14,100, 30 = $28,200)
- **Founding 50 program** — 0% platform fee for 12 months (27 slots remaining)
- **Terminal UI** — Simulated 10-phase Docker-based agent ingest flow (pull → inspect → manifest → capabilities → schemas → tools → SLA → policy → eval → wrap)
- **Builder guarantees** — 4 pillars: Sandboxed Execution, Transparent Economics (0% → 8% flat), SLA-Backed Escrow, Full Telemetry Access
- **A2A Protocol spec** — JobSpec input and RunResult output format
- **Founding slots form** — Email capture + optional Docker image URI, progress bar (23/50 claimed)

**Data:** `DEMAND_FEED` (12 items), `SCAN_LINES` (terminal output), `STATS`, `GUARANTEES`

### `vision.jsx` — Product Roadmap

Scrollable presentation with fade-in animations, section-based navigation.

**3-phase rollout:**
1. **Phase 01: Dual Vertical MVP** (8–10 weeks) — Intent submission, 10–15 curated agents, blind auctions, SLA templates, Stripe/USDC escrow, reputation scoring
2. **Phase 02: Token Launch** (6–8 weeks post-MVP) — Utility token staking/governance, tiered fee discounts (BNB model), on-chain escrow migration, agentic wallet R&D
3. **Phase 03: Full Agentic Market** (3–6 months post-MVP) — Open agent registration, autonomous bidding, multi-vertical expansion, agentic wallets & x402 payments, decentralized dispute arbitration

**Market context stats:** 16–20% of searches show AIO, –34% CTR drop post-AIO, 60% of users encountered AIO, 33% of traffic still from organic

**Risk matrix:** 5 risks with mitigations (AIO verification, algorithm volatility, CTR erosion, quality degradation, regulatory token risk)

**Token utility:** Eligibility staking, fee discounts, bandwidth allocation, governance voting

---

## Architecture & Conventions

### Technology Stack
- **Framework:** React 18+ (hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- **Styling:** Inline CSS objects — no external stylesheets or CSS-in-JS libraries
- **State management:** Local component state only — no Redux, Context, or external stores
- **Animations:** CSS `@keyframes` injected via `<style>` tags within components

### Design Tokens

**Fonts (loaded via Google Fonts):**
- Display: `Rajdhani` — headings, large numbers
- Sans: `DM Sans` — body text, descriptions
- Mono: `JetBrains Mono` — labels, data values, code, protocol specs

**Font object** (used across all files):
```js
const ft = {
  display: "'Rajdhani', sans-serif",
  sans: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace"
};
```

**Color palette:**
- Primary blue: `#42A5F5`
- Deep blue: `#1565C0`
- Background: `#060A12` (deep navy/near-black)
- Green (success): `#66BB6A`
- Orange (warning/pending): `#FFA726`
- Purple (artifacts): `#AB47BC`
- Pink: `#EC407A`
- Red (error): `#EF5350`
- Light blue (AIO badge): `#90CAF9`
- Text primary: `#E3F2FD`
- Text secondary: `rgba(255,255,255,.3)` to `rgba(255,255,255,.5)`
- Card backgrounds: `rgba(255,255,255,.02)` to `rgba(255,255,255,.04)`
- Borders: `rgba(66,165,245,.07)` to `rgba(255,255,255,.05)`

### Responsive Design

**Breakpoints:**
- Mobile: `< 768px`
- Tablet: `768px – 1023px`
- Desktop: `>= 1024px`

**Hook:** `useMedia()` returns `{ w, mob, tab, desk }` (desk only in mvp.jsx)

**Patterns:**
- Mobile-first stacked layouts
- Horizontal scrolling for KPI strips on mobile
- Desktop uses CSS grid and sidebar navigation
- Mobile uses bottom tab bar

### Component Patterns

All page components receive breakpoint booleans: `function PageName({ mob, tab })`

**Naming conventions:**
- Constants: `UPPER_SNAKE_CASE` (e.g., `MOCK_AGENTS`, `REVENUE_MONTHS`)
- Components: `PascalCase` (e.g., `AgentMatchCard`, `ExecutionProgress`)
- Local variables: `camelCase`
- Font shorthand: `ft.mono`, `ft.sans`, `ft.display`
- Color shorthand: `blue`, `blueDeep`, `bg`

**Inline style convention:**
```js
style={{ fontFamily: ft.mono, fontSize: 10, fontWeight: 700, color: blue, letterSpacing: ".08em", textTransform: "uppercase" }}
```

**Interactive states:** Managed via `onMouseEnter`/`onMouseLeave` setting style properties directly on `e.currentTarget.style`.

---

## Domain Concepts

### A2A Protocol
The core protocol governing agent-to-marketplace communication:

**JobSpec (input):** `agent_id`, `client_id`, `intent_signal_id`, parameters, `budget_cap`, SLA requirements, `escrow_tx_id`, `callback_url`

**RunResult (output):** status (`completed | failed | checkpoint | cancelled`), `artifacts[]`, metrics, SLA report, `cost_actual`, duration, `telemetry_log`, `escrow_release_signal`

**Wrapper responsibilities:** Format Translation, Budget Enforcement, Tool Allowlist, Structured Telemetry, Checkpointing, Artifact Schema

### Verticals
- **SEO** — Technical audits, keyword ranking, link building, on-page optimization, crawl analysis
- **AIO** — AI Overview citation placement, content restructuring, schema markup, entity resolution, FAQ generation

### Agent Lifecycle
1. Docker image submitted
2. 10-phase automated scan (pull → inspect → manifest → capabilities → schemas → tools → SLA → policy → eval → wrap)
3. Sandbox testing with test JobSpecs
4. Evaluation run against claimed metrics
5. Review & approval (compliance, telemetry, thresholds)
6. Live on marketplace (published, routable, monitored)

### Intent Flow
1. SMB submits intent (natural language or structured)
2. Intent matched to vertical(s)
3. Agents bid (blind auction)
4. SMB selects agent
5. Funds locked in escrow
6. Agent executes autonomously
7. SLA verified → escrow released or partial refund

### Agent Registry (6 agents in mock data)
| ID | Name | Verticals | Reputation | Success Rate | Status |
|----|------|-----------|------------|-------------|--------|
| agt-001 | RankForge | SEO | 92 | 94.7% | live |
| agt-002 | OverviewFirst | AIO | 94 | 91.4% | live |
| agt-003 | Linksmith AI | SEO | 89 | 88.3% | live |
| agt-004 | SerpAgent | SEO | 0 | 79.3% | evaluation |
| agt-005 | ContentMesh | AIO | 91 | 96.3% | live |
| agt-006 | TechSEO Pro | SEO, AIO | 96 | 97.2% | live |

### Economics
- **Founding 50:** 0% platform fee for 12 months
- **Standard fee:** 8% flat clearing fee
- **Currencies:** USDC and USD
- **Transaction types:** clearing, milestone, refund
- **Escrow states:** pending → locked → released (or partial refund on SLA miss)

---

## Cross-File Relationships

```
demand.jsx  ←→  waitlist.jsx
  (SMB side)      (Agent builder side)
      ↓                  ↓
      └──→  mvp.jsx  ←──┘
         (Core Marketplace)
               ↑
          vision.jsx
        (Future Roadmap)
```

- `demand.jsx` and `waitlist.jsx` are complementary two-sided marketplace UIs
- `mvp.jsx` is the operational hub aggregating data from both sides
- `vision.jsx` is the strategic narrative and roadmap
- Agent data in `demand.jsx` mirrors the profiles defined in `mvp.jsx`
- The 10-phase scan pipeline appears in both `mvp.jsx` (Registry) and `waitlist.jsx` (Terminal UI)
- SLA templates in `mvp.jsx` correspond to the SLA-backed escrow guarantees in `waitlist.jsx`

---

## Working With This Codebase

### Adding a new page/tab
1. Define mock data constants at the top of `mvp.jsx`
2. Create a new page component accepting `{ mob, tab }` props
3. Add entry to `navItems` array in the `App()` component
4. Add routing case in the main content area's conditional render

### Adding a new agent
1. Add to `MOCK_AGENTS` in `mvp.jsx` with full spec (capabilities, I/O schemas, tool requirements, SLA, policy, eval claims, stats)
2. Optionally mirror in `demand.jsx` `AGENTS` array (simplified version)

### Adding a new intent/signal
1. Add to `MOCK_INTENTS` for the Market tab
2. Add to `LIVE_SIGNALS` for the Live tab
3. Add to `INTENT_MARKET` for the demand analysis view

### Adding a new UI component
1. Follow existing patterns: inline styles, `ft` font object, color constants
2. Accept `mob` prop for responsive behavior
3. Keep self-contained — no external dependencies

### Style guidelines
- All styling is inline — do not create separate CSS files
- Use the `ft` font object for all `fontFamily` declarations
- Use named color constants (`blue`, `blueDeep`, etc.) not raw hex values
- Card backgrounds: `rgba(255,255,255,.02)`, borders: `rgba(66,165,245,.07)`
- Monospace labels: `fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase"`
- Use `borderRadius: 14` for cards, `borderRadius: 100` for badges/pills
