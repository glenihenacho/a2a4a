# CLAUDE.md — AgenticProxies (A2A Protocol)

## What This Project Is

AgenticProxies is a **dual-vertical AI agent marketplace** connecting SMBs (small-to-medium businesses) with autonomous AI agents that perform **SEO** and **AI Overview (AIO)** optimization. The platform operates on the **A2A Protocol** (Supply Agent → Marketplace → Demand Agent), an escrow-protected, SLA-enforced job execution framework where agents compete on performance and get paid on delivery.

**Three-layer architecture:**
- **Demand side** — A marketplace-deployed **Demand Agent** with persistent memory serves each SMB, retaining job history, preferred agents, business context, and budget patterns across sessions
- **Marketplace** — The orchestration layer handling intent matching, ad-ranked agent positioning, escrow, SLA verification, and container execution
- **Supply side** — Third-party AI agents (deployed as Docker containers) bid for positioning and execute jobs autonomously in fresh, sandboxed containers

**Settlement model:** Funds are locked in escrow before execution. Agents that hit SLA targets (verified by the platform or a third-party oracle) get instant release; misses trigger partial refunds via **tiered thresholds** (same formula across both verticals): <25% of SLA target = full refund, 25–75% = 50% refund, >75% = no refund. No payout floor on total failure (zero milestones), but once any milestone is delivered the agent keeps a minimum payout.

---

## Repository Structure

```
a2a4a/
├── CLAUDE.md              # This file — project context and conventions
├── package.json           # Vite + React 18 + Hono backend
├── vite.config.js         # Vite build config with React plugin + API proxy
├── drizzle.config.js      # Drizzle ORM config for migrations
├── index.html             # Root HTML — Google Fonts, global resets
├── .env.example           # Environment variable template
├── .gitignore             # node_modules, dist, .env
├── mvp.jsx                # Original standalone (preserved, canonical source)
├── demand.jsx             # Original standalone (preserved)
├── waitlist.jsx           # Original standalone (preserved)
├── vision.jsx             # Original standalone (preserved)
├── server/                # Hono backend API
│   ├── index.js           # Hono app with all API routes
│   └── db/
│       ├── index.js       # Drizzle client + connection
│       ├── schema.js      # Drizzle table definitions (agents, intents, transactions, etc.)
│       ├── seed.js        # Seed script — populates DB from mock data
│       └── migrations/    # Generated Drizzle migrations
└── src/
    ├── main.jsx           # React DOM entry point + BrowserRouter
    ├── App.jsx            # Top-level router with lazy-loaded routes
    ├── shared/
    │   ├── tokens.js      # Design tokens — ft, colors, bg (single source of truth)
    │   ├── hooks.js       # useMedia() responsive hook + useApiData() data fetching hook
    │   ├── api.js         # API client — centralized fetch layer for all backend calls
    │   └── primitives.jsx # Badge, VBadge, ScoreBar, Card, ScrollX, Sparkline, BarChart, DonutChart
    └── pages/
        ├── Dashboard.jsx  # Core marketplace (was mvp.jsx) — 5-tab internal navigation
        ├── Demand.jsx     # Demand Agent interface (was demand.jsx)
        ├── Waitlist.jsx   # Agent builder onboarding (was waitlist.jsx)
        └── Vision.jsx     # Product roadmap (was vision.jsx)
```

### Build & Run

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (HMR, frontend only)
npm run dev:server   # Start Hono API server on port 3001
npm run dev:full     # Start both API server + Vite concurrently
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
```

### Database

```bash
# Requires a running Postgres instance (see .env.example for connection string)
npm run db:push      # Push schema directly to database (dev)
npm run db:generate  # Generate migration files from schema changes
npm run db:migrate   # Run pending migrations (production)
npm run db:seed      # Seed database with mock data
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect → `/dashboard` | Default entry |
| `/dashboard` | `MarketplaceApp` | Core marketplace with 5 internal tabs |
| `/demand` | `DemandChat` | Demand Agent interface (persistent memory, per-SMB) |
| `/waitlist` | `SupplyWaitlist` | Agent builder landing page |
| `/vision` | `Vision` | Product roadmap |

### Shared Modules

**`src/shared/tokens.js`** — All design tokens extracted from the original files. Font object (`ft`), color constants (`blue`, `blueDeep`, `bg`, `green`, `orange`, `purple`, `pink`, `red`, `lightBlue`, `textPrimary`). Import these instead of redeclaring.

**`src/shared/hooks.js`** — `useMedia()` hook returning `{ w, mob, tab, desk }`. `useApiData(fetchFn, fallback)` hook for fetching data from the API with graceful fallback to inline mock data.

**`src/shared/api.js`** — Centralized API client with named exports for every backend endpoint: `fetchAgents`, `fetchIntents`, `fetchTransactions`, `fetchSignals`, `fetchMetrics`, `fetchIntentMarket`, `fetchIntentCategories`, `fetchSlaTemplates`, `fetchWrapperSpec`, `fetchScanPhases`, `fetchPipelineStages`, `fetchStatusCfg`.

**`src/shared/primitives.jsx`** — Reusable UI components extracted from `mvp.jsx`: `Badge`, `VBadge`, `ScoreBar`, `Card`, `ScrollX`, `Sparkline`, `BarChart`, `DonutChart`.

---

## Backend (Hono + Drizzle + Postgres)

### `server/index.js` — Hono API Server

The API server runs on port 3001 (configurable via `PORT` env var). Vite proxies `/api/*` requests to it during development.

**API routes:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | All agents (reshaped to match frontend format) |
| `GET` | `/api/agents/:id` | Single agent by ID |
| `POST` | `/api/agents` | Create new agent |
| `GET` | `/api/intents` | All intents (SMB job requests) |
| `GET` | `/api/intents/:id` | Single intent by ID |
| `POST` | `/api/intents` | Create new intent |
| `GET` | `/api/transactions` | Transaction history |
| `GET` | `/api/signals` | Live auction signal feed |
| `GET` | `/api/escrow` | Escrow view (derived from intents) |
| `GET` | `/api/metrics` | Revenue months, perf metrics, vertical split, trending |
| `GET` | `/api/intent-market` | Intent market analysis data |
| `GET` | `/api/intent-categories` | Industry category aggregates |
| `GET` | `/api/sla-templates` | SLA templates grouped by vertical |
| `GET` | `/api/config/wrapper-spec` | A2A Protocol wrapper specification |
| `GET` | `/api/config/scan-phases` | 10-phase agent onboarding pipeline |
| `GET` | `/api/config/pipeline-stages` | 7-step onboarding funnel |
| `GET` | `/api/config/status-cfg` | Intent status display config |
| `GET` | `/api/health` | Health check |

Static/config data (PERF_METRICS, VERTICAL_SPLIT, TRENDING_UP, WRAPPER_SPEC, SCAN_PHASES, PIPELINE_STAGES, STATUS_CFG) is served from in-memory constants in the server since it's not entity data that needs a database.

### `server/db/schema.js` — Drizzle Schema

**Tables:** `agents`, `intents`, `transactions`, `signals`, `intent_market`, `sla_templates`, `revenue_months`, `intent_categories`

**Enums:** `vertical` (SEO/AIO), `agent_status`, `intent_status`, `txn_type`, `txn_status`, `currency`, `signal_status`, `aio_pos`, `escrow_state`

Complex nested data (capabilities, SLA params, policies, eval claims, schemas) is stored as `jsonb` columns.

### `server/db/seed.js` — Database Seed Script

Populates all tables from the same mock data that was previously hardcoded in the frontend. Run with `npm run db:seed`.

### Data Flow

```
Frontend (React)
  └── src/shared/api.js ── fetch("/api/...") ──→ Vite proxy ──→ Hono API (port 3001)
                                                                      │
                                                                      ↓
                                                              Drizzle ORM queries
                                                                      │
                                                                      ↓
                                                              PostgreSQL database
```

The frontend retains all mock data inline as fallbacks — if the API server is unavailable, the app renders with hardcoded data (same behavior as before the backend was added).

---

## File-by-File Breakdown

### `src/pages/Dashboard.jsx` (was `mvp.jsx`) — Core Marketplace Platform

The largest file. Contains the operational hub with 5 tabbed pages and all mock data. Chart primitives have been extracted to `src/shared/primitives.jsx`.

**Navigation tabs (in order):**
1. **Dashboard** (`"dashboard"`, icon `◎`) — Revenue metrics, bar/donut charts, transaction history, top agents, vertical split (SEO 55% / AIO 45%)
2. **Market** (`"intents"`, icon `◉`) — SMB demand signals with search volume, AIO rates, CTR impact, industry categories, intent detail drill-down, budget activation
3. **Live** (`"auctions"`, icon `⚡`) — Real-time signal feed with ad-ranked positioning data, spend, impressions, AIO visibility, agent count, 7-day spend sparklines, status filters (live/warming/cooling)
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

**UI primitives** (now in `src/shared/primitives.jsx`):
- `Badge`, `VBadge` — Status/tag indicators
- `ScoreBar` — Horizontal progress bar
- `Card` — Reusable card container
- `ScrollX` — Horizontal scroll wrapper
- `Sparkline` — Mini SVG line chart
- `BarChart` — Multi-series bar chart with legend
- `DonutChart` — Pie/donut segment visualization

**Page components** (internal to Dashboard.jsx):
- `Dashboard({ mob, tab })` — Revenue metrics, charts, transactions
- `Intents({ mob, tab })` — Market demand signals
- `Agents({ mob, tab })` — Agent registry
- `Live({ mob, tab })` — Real-time signal feed
- `Escrow({ mob })` — Escrow status
- `MarketplaceApp()` (main, `export default`) — App shell with sidebar + tab navigation

### `src/pages/Demand.jsx` (was `demand.jsx`) — Demand Agent Interface

The front-end for the **Demand Agent** — a marketplace-deployed agent with **persistent memory** that serves each SMB. The Demand Agent retains past job results, preferred agents, business context (industry, size, goals), and budget patterns across sessions, getting smarter over time per SMB. Unlike supply agents, the Demand Agent does not go through the Docker scan pipeline — it is a first-party platform agent. **The Demand Agent does not produce RunResults** — it is a stateful orchestrator that creates JobSpecs and monitors supply agent execution, but its own work is not modeled as an A2A protocol job.

**Flow phases:** intro → gathering → matching → costing → executing → complete

**Scripted conversation demo:** A bakery wants local SEO + AIO ranking. The Demand Agent extracts intent, presents ad-ranked agents, shows cost breakdown ($504 for TechSEO Pro), demonstrates execution monitoring through 6 stages, delivers artifacts, and releases escrow funds.

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

### `src/pages/Waitlist.jsx` (was `waitlist.jsx`) — Supply-Side Agent Builder Waitlist

Marketing/onboarding landing page targeting agent builders who want to monetize their AI agents.

**Key sections:**
- **Hero** — "Your agent already works. Now let it earn." with 142 SMBs stat
- **Live demand feed** — 12 rotating SMB demand items across industries
- **Agent economics** — Revenue projections (5 clients = $4,700/mo, 15 = $14,100, 30 = $28,200)
- **Founding 50 program** — 0% platform fee + 0% CPE bid fees for 12 months (27 slots remaining)
- **Terminal UI** — Simulated 10-phase Docker-based agent ingest flow (pull → inspect → manifest → capabilities → schemas → tools → SLA → policy → eval → wrap)
- **Builder guarantees** — 4 pillars: Sandboxed Execution (fresh container per job, enforced Tool Allowlist), Transparent Economics (0% → 8% flat clearing + CPE bids), SLA-Backed Escrow, Full Telemetry Access
- **A2A Protocol spec** — JobSpec input and RunResult output format
- **Founding slots form** — Email capture + optional Docker image URI, progress bar (23/50 claimed)

**Data:** `DEMAND_FEED` (12 items), `SCAN_LINES` (terminal output), `STATS`, `GUARANTEES`

### `src/pages/Vision.jsx` (was `vision.jsx`) — Product Roadmap

Scrollable presentation with fade-in animations, section-based navigation.

**3-phase rollout:**
1. **Phase 01: Dual Vertical MVP** (8–10 weeks) — Intent submission, 10–15 curated agents, ad-model agent positioning (cost-per-engagement bids), SLA templates, Stripe/USDC escrow, reputation scoring
2. **Phase 02: Token Launch** (6–8 weeks post-MVP) — Utility token staking/governance, tiered fee discounts (BNB model), on-chain escrow migration, agentic wallet R&D
3. **Phase 03: Full Agentic Market** (3–6 months post-MVP) — Open agent registration, autonomous bidding, multi-vertical expansion, agentic wallets & x402 payments, decentralized dispute arbitration

**Market context stats:** 16–20% of searches show AIO, –34% CTR drop post-AIO, 60% of users encountered AIO, 33% of traffic still from organic

**Risk matrix:** 5 risks with mitigations (AIO verification, algorithm volatility, CTR erosion, quality degradation, regulatory token risk)

**Token utility:** Eligibility staking, fee discounts, bandwidth allocation, governance voting

---

## Architecture & Conventions

### Technology Stack
- **Frontend:** React 18+ (hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `createContext`)
- **Backend:** Hono (lightweight HTTP framework) on Node.js with `@hono/node-server`
- **Database:** PostgreSQL with Drizzle ORM (`drizzle-orm` + `drizzle-kit` for migrations)
- **Build:** Vite 6 with `@vitejs/plugin-react`, API proxy to Hono backend
- **Routing:** React Router DOM 6 with lazy-loaded page components
- **Styling:** Inline CSS objects — no external stylesheets or CSS-in-JS libraries
- **State management:** Local component state + React Context (DataContext in Dashboard.jsx)
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
The core protocol governing the three-layer flow: **Supply Agent → Marketplace → Demand Agent**.

**JobSpec (input):** `agent_id`, `client_id`, `intent_signal_id`, parameters, `budget_cap`, SLA requirements, `escrow_tx_id`, `callback_url`

**RunResult (output):** status (`completed | failed | checkpoint | cancelled`), `artifacts[]`, metrics, SLA report, `cost_actual`, duration, `telemetry_log`, `escrow_release_signal`

**Wrapper responsibilities:** Format Translation, Budget Enforcement, Tool Allowlist, Structured Telemetry, Checkpointing, Artifact Schema

**Protocol boundary — Demand Agent does NOT produce RunResults.** JobSpec/RunResult is the contract between the marketplace and **supply agents only**. The Demand Agent is a first-party stateful orchestrator, not a task executor. It does not go through Docker scan, does not compete in ad-ranked positioning, and has no escrow settlement. Its orchestration work (intent extraction, agent matching, cost estimation, job dispatch) is logged via platform-internal telemetry, not A2A protocol artifacts. Rationale: RunResult assumes bounded atomic jobs with financial settlement — the Demand Agent's conversational, session-spanning, per-SMB lifecycle does not fit that model.

### Verticals
- **SEO** — Technical audits, keyword ranking, link building, on-page optimization, crawl analysis
- **AIO** — AI Overview citation placement, content restructuring, schema markup, entity resolution, FAQ generation

SEO and AIO are **separate job types** with distinct SLA templates, but a **single job can span both verticals** (e.g., a local bakery wanting both organic ranking and AIO citation). The platform could theoretically split a multi-vertical job across specialist agents (one SEO, one AIO), but **multi-agent escrow coordination is out of scope** for the current phase — so for now, a multi-vertical job is assigned to one agent capable of both (e.g., TechSEO Pro).

### Supply Agent Lifecycle
1. Docker image submitted by agent builder
2. **One-time** 10-phase automated scan per agent version (pull → inspect → manifest → capabilities → schemas → tools → SLA → policy → eval → wrap) — pushing a new image version triggers a re-scan
3. Sandbox testing with test JobSpecs
4. Evaluation run against claimed metrics
5. Review & approval (compliance, telemetry, thresholds)
6. Live on marketplace (published, routable, monitored)

**Execution model:** Each job spins up a **fresh container** from the agent's approved image. Containers can make outbound HTTP requests (crawling, APIs) and write to persistent storage. The **Tool Allowlist** in the A2A wrapper is an actual enforcement mechanism, not aspirational. When a new agent version is submitted, in-progress jobs continue running on the old version; new jobs use the new version. SMBs cannot pin to a specific agent version.

### Intent Flow
1. SMB submits intent (natural language or structured) via Demand Agent
2. Demand Agent extracts intent and matches to vertical(s)
3. Eligible supply agents are ranked using an **ad-model**: agents bid for positioning (cost-per-engagement), with higher bids yielding better rank — low-reputation agents must bid more to compete with high performers
4. SMB selects agent from the ranked list (engagement triggers bid charge)
5. Funds locked in escrow
6. Platform spins up a fresh container for the selected supply agent; agent executes autonomously
7. SLA verified by platform or third-party oracle → escrow released or partial refund

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

**Two revenue streams:**
1. **Clearing fee** — 8% flat fee on completed jobs
2. **Cost-per-engagement (CPE) bids** — Supply agents pay when an SMB selects them from the ranked list. Higher bids = better positioning. Low-reputation agents must bid more to compete with high performers.

**Founding 50 program:** Waives **both** clearing fees and CPE bid fees for 12 months. Founding agents can still choose to bid for positioning but are not charged.

- **Currencies:** USDC and USD
- **Transaction types:** clearing, milestone, refund, CPE bid charge
- **Escrow states:** pending → locked → released (or partial refund on SLA miss via tiered thresholds)

---

## Cross-File Relationships

```
server/index.js ──→ Hono API serving data from PostgreSQL via Drizzle
server/db/schema.js ──→ Database table definitions
server/db/seed.js ──→ Populates DB from mock data

src/shared/tokens.js ──→ All pages (single source of truth for design tokens)
src/shared/hooks.js  ──→ All pages (useMedia + useApiData hooks)
src/shared/api.js    ──→ Dashboard.jsx, Demand.jsx (API client layer)
src/shared/primitives.jsx ──→ Dashboard.jsx (extracted UI components)

src/pages/Demand.jsx  ←→  src/pages/Waitlist.jsx
   (Demand Agent)           (Supply Agent builders)
         ↓                         ↓
         └──→  src/pages/Dashboard.jsx  ←──┘
                  (Core Marketplace)
                        ↑
               src/pages/Vision.jsx
                 (Future Roadmap)

src/App.jsx ──→ Routes all pages via React Router
vite.config.js ──→ Proxies /api/* to Hono backend (port 3001)
```

- `Demand.jsx` (Demand Agent) and `Waitlist.jsx` (Supply Agent onboarding) are complementary two-sided marketplace UIs
- `Dashboard.jsx` is the operational hub aggregating data from both sides
- `Vision.jsx` is the strategic narrative and roadmap
- Agent data in `Demand.jsx` mirrors the profiles defined in `Dashboard.jsx`
- The 10-phase scan pipeline appears in both `Dashboard.jsx` (Registry) and `Waitlist.jsx` (Terminal UI)
- SLA templates in `Dashboard.jsx` correspond to the SLA-backed escrow guarantees in `Waitlist.jsx`
- Design tokens (`ft`, colors) are shared via `src/shared/tokens.js` — no duplication

---

## Working With This Codebase

### Adding a new page/tab (within marketplace)
1. Define mock data constants at the top of `src/pages/Dashboard.jsx`
2. Create a new page component accepting `{ mob, tab }` props
3. Add entry to `navItems` array in `MarketplaceApp()`
4. Add routing case in the main content area's conditional render

### Adding a new top-level route
1. Create a new page component in `src/pages/`
2. Import shared tokens from `../shared/tokens` and hooks from `../shared/hooks`
3. Add a lazy import and `<Route>` in `src/App.jsx`
4. Optionally add to `NAV_ITEMS` in `src/App.jsx`

### Adding a new agent
1. Add to `MOCK_AGENTS` in `src/pages/Dashboard.jsx` with full spec
2. Optionally mirror in `src/pages/Demand.jsx` `AGENTS` array (simplified version)

### Adding a new intent/signal
1. Add to `MOCK_INTENTS` for the Market tab
2. Add to `LIVE_SIGNALS` for the Live tab
3. Add to `INTENT_MARKET` for the demand analysis view

### Adding a new UI component
1. Follow existing patterns: inline styles, `ft` font object, color constants
2. Import tokens from `src/shared/tokens.js` — never redeclare
3. Accept `mob` prop for responsive behavior
4. If reusable across pages, add to `src/shared/primitives.jsx`

### Style guidelines
- All styling is inline — do not create separate CSS files
- Import from `src/shared/tokens.js` for all `fontFamily`, color, and background values
- Use named color constants (`blue`, `blueDeep`, etc.) not raw hex values
- Card backgrounds: `rgba(255,255,255,.02)`, borders: `rgba(66,165,245,.07)`
- Monospace labels: `fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase"`
- Use `borderRadius: 14` for cards, `borderRadius: 100` for badges/pills

---

## Production Roadmap

**Target stack:** Hono (backend) + Drizzle (ORM) + Postgres + Lucia (auth) + Stripe (payments) + Docker + Fly.io

**Current state:** React SPA with Hono backend API + Drizzle ORM + PostgreSQL schema. Frontend fetches from API with inline fallbacks. Dev tooling (ESLint, Prettier, Husky) and frontend tests (Vitest, Playwright) are configured. No auth, payments, Docker runtime, or deployment config yet.

### Phase 0: Dev Tooling (1–2 days)
- ESLint + Prettier + `.editorconfig`
- `lint-staged` + `husky` pre-commit hooks
- `npm run lint` and `npm run format` scripts

### Phase 1: Frontend Tests (2–3 days)
- Vitest + React Testing Library for component tests
- Playwright for E2E (scripted conversation flow in Demand, tab navigation in Dashboard)
- `npm test` and `npm run test:e2e` scripts

### Phase 2: CI/CD Pipeline (1 day)
- GitHub Actions: lint → test → build on every PR
- Playwright E2E in CI with headless browser
- Build artifact caching

### Phase 3: Backend API — Hono ✅
- `/server` directory with Hono app (`server/index.js`)
- API routes mirroring the current mock data:
  - `GET/POST /api/agents` — registry CRUD
  - `GET/POST /api/intents` — market intents
  - `GET /api/signals` — live auction feed
  - `GET /api/escrow` — escrow view (derived from intents)
  - `GET /api/transactions` — transaction history
  - `GET /api/metrics` — revenue, perf metrics, vertical split, trending
  - `GET /api/intent-market` — intent market analysis
  - `GET /api/intent-categories` — industry categories
  - `GET /api/sla-templates` — SLA templates by vertical
  - `GET /api/config/*` — wrapper spec, scan phases, pipeline stages, status config
  - `GET /api/health` — health check
- Vite dev proxy configured (`/api/*` → `localhost:3001`)
- Frontend migrated from hardcoded data to `fetch()` calls with inline fallbacks
- `src/shared/api.js` — centralized fetch layer
- `src/shared/hooks.js` — `useApiData()` hook with graceful fallback
- Dashboard.jsx uses `DataContext` to provide API data to sub-components
- Demand.jsx overlays API-fetched agents onto scripted conversation

### Phase 4: Database — Postgres + Drizzle ✅
- Schema (`server/db/schema.js`):
  - `agents` — registry, capabilities (jsonb), SLA params (jsonb), reputation, status
  - `intents` — SMB demand signals, vertical, status, budget, agent assignment
  - `transactions` — clearing fees, milestones, refunds
  - `signals` — live auction data, rank, spend, impressions, 7d sparklines
  - `intent_market` — market analysis with volume trends, AIO rates, CTR deltas
  - `sla_templates` — SLA types by vertical
  - `revenue_months` — monthly platform revenue
  - `intent_categories` — industry category aggregates
- Drizzle config (`drizzle.config.js`) with migration support via `drizzle-kit`
- Seed script (`server/db/seed.js`) populated from current mock data constants
- API routes use Drizzle queries against PostgreSQL
- **Deferred to Phase 5:** `users` table, `jobs` table (JobSpec lifecycle), `escrow` state machine table

### Phase 5: Auth — Lucia (3–5 days)
- Two account types: `smb` (demand side) and `builder` (supply side)
- Lucia session-based auth with Postgres session store
- Login/register pages in frontend
- Protected API routes via Hono middleware
- Demand Agent sessions tied to authenticated SMB user
- Agent builder dashboard scoped to their own agents

### Phase 6: Escrow + Payments — Stripe (1–2 weeks)
- Stripe Connect for agent builder payouts
- Payment intents for job funding (SMB pays → escrow locks)
- Escrow state machine in backend:
  - `pending` → SMB approves cost → `locked`
  - Job completes + SLA passes → `released`
  - SLA miss → tiered refund (<25% target = full refund, 25–75% = 50%, >75% = none)
  - Floor only on partial delivery (≥1 milestone hit)
- Stripe webhook handlers for payment events
- USD/Stripe only for MVP — USDC deferred to token launch phase

### Phase 7: Docker + Deployment (3–5 days)
- `Dockerfile` — Hono backend serves API + static Vite frontend build
- `docker-compose.yml` — local dev (Hono + Postgres)
- `fly.toml` — Fly.io deployment config
- Fly Postgres managed instance
- GitHub Actions: deploy on merge to `main`
- Environment management (`.env.example`, Fly secrets for Stripe keys, DB URL, Lucia secret)

### Deferred (post-MVP)
- Docker agent runtime (container-per-job sandboxed execution)
- 10-phase automated scan pipeline (real, not simulated)
- Token launch (utility staking, governance, fee discounts)
- USDC / on-chain escrow migration
- Multi-agent job coordination (splitting SEO + AIO across specialist agents)
- Automated SLA oracle verification
- Agentic wallets + x402 payments
