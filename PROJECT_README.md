# Clinical Intelligence Hub — Project Overview

> **AI-Powered Clinical Trial Search Platform**
> Natural language search over 500,000+ clinical trials from ClinicalTrials.gov
> using GPT-4o, MeSH medical vocabulary, and the AACT PostgreSQL database.

**Live URL:** [https://clinical-frontend.own7.aganitha.ai](https://clinical-frontend.own7.aganitha.ai)

---

## 1. Problem Statement

Clinical trial data is enormous, complex, and locked behind rigid search interfaces. Researchers, pharma teams, and medical professionals need to ask questions like:

- *"Show me Phase 3 trials for lung cancer with pembrolizumab"*
- *"Active monoclonal antibody trials in cardiovascular diseases, excluding cancer"*
- *"Trials targeting EGFR in oncology"*

**Existing tools** (ClinicalTrials.gov) require exact medical terminology, manual filters, and multiple searches. There is no intelligence layer — no charts, no heatmaps, no AI-powered understanding of user intent.

### Our Solution

An **intelligent search engine** that:
1. **Understands natural language** using GPT-4o
2. **Resolves medical terminology** automatically (e.g., "lung cancer" → MeSH: "Lung Neoplasms")
3. **Searches across 500K+ trials** with complex multi-table SQL queries
4. **Visualizes results** with interactive charts and a clinical intelligence heatmap
5. **Supports exclusion logic** (e.g., "except cancer" removes all cancer-related trials)

---

## 2. Key Features

| Feature | Description |
|---------|-------------|
| **Natural Language Search** | Type queries in plain English — GPT-4o extracts conditions, drugs, phases, sponsors, and exclusions |
| **MeSH Term Resolution** | Automatically maps common medical terms to official NIH MeSH vocabulary using NCBI E-Utilities API |
| **6-Way Filter Matrix** | Dynamic filter panel: Phase, Status, Sponsor, Conditions, Interventions, Outcomes |
| **Clinical Intelligence Matrix** | Interactive Disease × Drug × Phase heatmap showing trial landscape at a glance |
| **5 Dashboard Charts** | Phase distribution, top diseases, top drugs, sponsor breakdown, matched conditions |
| **Exclusion Support** | "except cancer" or "not placebo" — excluded terms are resolved via MeSH and removed from results |
| **Spelling Correction** | GPT-4o auto-corrects typos: "keratoconos" → "keratoconus", "diabtes" → "diabetes" |
| **URL Persistence** | Search state (query + filters + page) saved in URL — shareable and bookmarkable |
| **Dark/Light Theme** | Toggle with localStorage persistence, respects system preference |
| **Server-Side Pagination** | 50 results per page, paginated at database level for performance |
| **Query Caching** | File-based cache for GPT-4o responses — avoids redundant API calls and reduces latency |

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.4 | UI framework (functional components + hooks) |
| Vite | 8.0.0 | Lightning-fast build tool + HMR dev server |
| TypeScript | 5.9.3 | Static type safety across all components |
| Tailwind CSS | 4.2 | Utility-first CSS with dark mode support |
| Recharts | 3.8.0 | Data visualization (bar charts, tooltips) |
| Lucide React | 0.577.0 | Beautiful SVG icon library |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 | Server runtime |
| Express | 5.2.1 | HTTP server framework |
| TypeScript | 5.9.3 | Type-safe backend code |
| ts-node | 10.9.2 | Runtime TypeScript execution (no build step) |
| pg | 8.20.0 | PostgreSQL driver (raw SQL, no ORM) |

### AI & Medical APIs
| Service | Endpoint | Purpose |
|---------|----------|---------|
| OpenAI GPT-4o | `api.openai.com` | Natural language → structured JSON extraction |
| NCBI E-Utilities | `eutils.ncbi.nlm.nih.gov` | MeSH medical term resolution |
| NLM MeSH Lookup | `id.nlm.nih.gov/mesh/lookup` | Fallback descriptor lookup |

### Database
| Service | Details |
|---------|---------|
| AACT PostgreSQL | `aact-db.ctti-clinicaltrials.org:5432` |
| Schema | `ctgov` — 7 tables across studies, conditions, interventions, sponsors, outcomes |
| Size | 500,000+ interventional clinical trials |
| Connection | SSL, pool of 5 connections, 120s statement timeout |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker | Containerization (2 containers) |
| Docker Compose | Multi-container orchestration |
| Nginx (Alpine) | Static file server + API reverse proxy |
| Slurm | HPC job scheduler for deployment |
| NFS | Shared filesystem across cluster nodes |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                          │
│   React SPA (Vite + Tailwind CSS + Recharts)                 │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Reverse Proxy (own7 cluster node)                │
│   Auto-discovers Docker containers, routes by domain name    │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP :80
                         ▼
┌──────────────────────────────────────────────────────────────┐
│               DOCKER NETWORK (2 containers)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     clinical-frontend (nginx:alpine) — Port 80       │   │
│  │                                                       │   │
│  │     /          → React SPA (static HTML/JS/CSS)       │   │
│  │     /api/*     → Reverse proxy to backend:3001        │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          │ HTTP :3001                         │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │     clinical-backend (node:20-slim) — Port 3001       │   │
│  │                                                        │   │
│  │     POST /api/search                                   │   │
│  │       Step 1: QueryParser  → GPT-4o                    │   │
│  │       Step 2: MeshService  → NCBI E-Utilities          │   │
│  │       Step 3: QueryBuilder → PostgreSQL (AACT)         │   │
│  └────────────┬──────────────────┬────────────────────────┘   │
│               │                  │                             │
└───────────────┼──────────────────┼─────────────────────────────┘
                │                  │
   ┌────────────▼────┐    ┌───────▼───────────────────────┐
   │   OpenAI API    │    │  AACT PostgreSQL Database      │
   │   (GPT-4o)      │    │  500K+ clinical trials         │
   │                 │    │  Schema: ctgov (7 tables)      │
   │ + NCBI MeSH     │    │  SSL + Connection Pooling      │
   │   E-Utilities   │    └───────────────────────────────┘
   └─────────────────┘
```

---

## 5. Search Pipeline — How a Query Works

When a user types a natural language query, the system processes it through a **5-stage pipeline**:

### Example: `"active trials for lung cancer with pembrolizumab in phase 3"`

```
STAGE 1 ─ AI Query Parsing (GPT-4o)
────────────────────────────────────
  Input:  "active trials for lung cancer with pembrolizumab in phase 3"
  Output: {
    conditions:    ["lung cancer"],
    interventions: ["pembrolizumab"],
    phases:        ["PHASE3"],
    is_active:     true,
    excluded_terms: []
  }
  ✦ Spelling auto-corrected
  ✦ Cached in .query_cache.json to avoid repeat API calls

STAGE 2 ─ MeSH Term Resolution (NCBI API)
──────────────────────────────────────────
  "lung cancer"     → MeSH: "Lung Neoplasms"
  "pembrolizumab"   → MeSH: "Pembrolizumab"

  ✦ Uses NCBI E-Utilities esearch endpoint
  ✦ Fallback to NLM Descriptor Lookup if esearch fails
  ✦ Both original AND MeSH terms used in SQL (maximum recall)

STAGE 3 ─ SQL Query Building
─────────────────────────────
  Builds dynamic WHERE clauses across 7 AACT tables:
  • conditions (original + MeSH, title + conditions + browse_conditions)
  • interventions (original + MeSH, title + interventions + browse_interventions)
  • phases, statuses, sponsors, outcomes
  • exclusion terms (NOT IN across all tables)
  • manual UI filter overrides (take priority over AI-parsed filters)

STAGE 4 ─ Parallel Query Execution
───────────────────────────────────
  Promise.all([
    Main data query  (50 rows, paginated),
    COUNT(*)         (total matching trials),
    Phase summary    (phase distribution chart),
    Sponsor summary  (sponsor type breakdown),
    Disease×Drug×Phase matrix  (heatmap data)
  ])
  ✦ 5 concurrent DB connections
  ✦ 120-second timeout per statement
  ✦ CTE optimization caps summaries at 5000 rows

STAGE 5 ─ JSON Response → Frontend Rendering
─────────────────────────────────────────────
  Response: {
    results:         [50 trial objects],
    totalCount:      1247,
    summary:         { phases, sponsors, relationships },
    filteredSummary: { ... },
    page: 1,
    totalPages: 25
  }
  → Charts render from summary data
  → Table renders from results array
  → Pagination controls from page/totalPages
```

---

## 6. Backend Architecture

### Single API Endpoint

```
POST /api/search
Body: { query: string, page: number, limit: number, filters: object }
```

### Three Core Modules

#### 6.1 QueryParser (`agents/QueryParser.ts`)
- Sends user query to **GPT-4o** with a detailed system prompt
- Extracts: conditions, interventions, phases, statuses, sponsors, outcomes, exclusions
- **Spelling correction**: "keratoconos" → "keratoconus"
- **No over-normalization**: keeps "lung cancer" as-is (MeSH handles mapping)
- **Retry logic**: exponential backoff on 429 rate limits (2s → 4s → 8s)
- **File-based cache**: `.query_cache.json` avoids repeat GPT-4o calls (~$0.01/call saved)

#### 6.2 MeshService (`services/MeshService.ts`)
- Resolves plain English medical terms to **official MeSH descriptors**
- Primary: NCBI E-Utilities esearch API → extracts from translationset
- Fallback: NLM MeSH Descriptor Lookup API (exact match)
- Example: "heart attack" → "Myocardial Infarction"

#### 6.3 QueryBuilder (`services/QueryBuilder.ts`) — 750+ LOC
- Builds **parameterized SQL** (prevents SQL injection)
- Searches across 7 AACT database tables:
  - `ctgov.studies` — Main table (nct_id, title, phase, status)
  - `ctgov.conditions` — Disease names per trial
  - `ctgov.browse_conditions` — MeSH-mapped conditions
  - `ctgov.interventions` — Drug/treatment names and types
  - `ctgov.browse_interventions` — MeSH-mapped interventions
  - `ctgov.sponsors` — Lead sponsors and agency class
  - `ctgov.design_outcomes` — Primary/secondary endpoints
- **Descendant drug detection**: statistical co-occurrence analysis to find sub-terms
- **Filter override logic**: manual UI filters override AI-parsed filters for same category

### Database Design Decision: No ORM
- Raw SQL for full control over complex multi-table JOINs
- Parameterized queries ($1, $2...) for SQL injection prevention
- `ILIKE` for case-insensitive matching
- JSON aggregation for one-row-per-trial output
- Connection pooling: max 5 connections, 120s timeout

---

## 7. Frontend Architecture

### Component Hierarchy

```
App.tsx                          ← Main state + search logic + URL persistence
  ├── ThemeToggle.tsx            ← Dark/Light mode (localStorage + system pref)
  ├── Search.tsx                 ← Search input + floating filter panel
  │     └── Filter Panel         ← 5 tabs: Phase, Status, Intervention, Condition, Sponsor
  ├── OverviewCharts.tsx         ← 5 interactive dashboard visualizations
  │     ├── Intelligence Matrix  ← Disease × Drug heatmap (CSS Grid, click-to-detail)
  │     ├── Phase Distribution   ← Bar chart (Recharts)
  │     ├── Matched Diseases     ← Top 10 horizontal bars
  │     ├── Matched Drugs        ← Top 10 horizontal bars
  │     └── Sponsor Breakdown    ← Horizontal bar chart
  └── ResultsTable.tsx           ← Paginated trial results table
        ├── Expandable tags      ← Disease (purple) + Drug (green) pills with "show more"
        ├── Status badges        ← Color-coded: green=recruiting, amber=active, indigo=completed
        └── Pagination           ← Page numbers + prev/next
```

### State Management (React useState + useCallback)

| State Variable | Type | Purpose |
|---------------|------|---------|
| `trials[]` | Trial[] | Current page of search results |
| `isLoading` | boolean | Shows spinner during API call |
| `hasSearched` | boolean | Toggles hero → results view |
| `page` | number | Current page number |
| `totalPages` | number | From totalCount / 50 |
| `totalCount` | number | Total matching trials |
| `lastQuery` | string | Last search text (for pagination) |
| `lastFilters` | Record | Last applied filters |
| `summary` | object | Chart data (phases, sponsors, relationships) |
| `filteredSummary` | object | Chart data after manual filter application |

### UI/UX Design Highlights
- **Glassmorphism**: backdrop-blur, white/40 backgrounds, frosted glass effect
- **Responsive**: mobile-first with md/lg breakpoints
- **Smooth animations**: fade-in, slide-in, scale transitions on hover
- **Rounded corners**: 2rem–3rem border-radius for modern card aesthetic
- **Dynamic filters**: filter options populated from search results (not hardcoded)
- **Dark mode**: full Tailwind `dark:` variant support across every component

### Chart Visualizations (5 total)

| # | Chart | Type | Data Source | Color Scheme |
|---|-------|------|-------------|-------------|
| 1 | **Clinical Intelligence Matrix** | CSS Grid Heatmap | Disease × Drug × Phase from trial data | Phase-based (amber=P1, violet=P2, indigo=P3, emerald=P4) |
| 2 | **Phase Distribution** | Vertical Bar (Recharts) | `summary.phases[]` | Multi-color per phase |
| 3 | **Matched Diseases** | Horizontal Bar (Recharts) | Aggregated from `trial.matched_conditions` | Red gradient |
| 4 | **Matched Drugs** | Horizontal Bar (Recharts) | Aggregated from `trial.matched_drugs` | Emerald gradient |
| 5 | **Lead Sponsor Types** | Horizontal Bar (Recharts) | `summary.sponsors[]` | Pink gradient |

---

## 8. Deployment Architecture

### Infrastructure: Slurm HPC Cluster

```
  INTERNET (HTTPS)
       │
       ▼
  own7 (Compute Node + Reverse Proxy)
  ├── Reverse Proxy Manager (auto-discovers Docker containers)
  ├── clinical-frontend container (nginx:alpine, port 80)
  └── clinical-backend container (node:20-slim, port 3001)
       │
  own3 (Slurm Head Node)
  ├── SSH access point (port 2322)
  └── sbatch dispatches jobs to own7
       │
  own5 (NFS Server)
  └── /shared/ mounted on all nodes (project files accessible everywhere)
```

### Docker Containers

| Container | Base Image | Size | Ports | Purpose |
|-----------|-----------|------|-------|---------|
| `clinical-frontend` | `nginx:alpine` | ~45 MB | 80 | Serve React SPA + proxy API calls |
| `clinical-backend` | `node:20-slim` | ~180 MB | 3001 | Express API server |

### Frontend Dockerfile (Multi-Stage Build)
```
Stage 1 (Build):  node:20-slim → npm ci → vite build → /app/dist
Stage 2 (Serve):  nginx:alpine → COPY dist → serve static + proxy API
Result: ~45 MB production image (vs ~180 MB build image discarded)
```

### Backend Dockerfile
```
node:20-slim → npm ci → COPY source → ts-node runtime execution
.env injected via docker-compose env_file (NOT baked into image)
```

### Nginx Reverse Proxy
```
/           → serves React SPA (try_files → index.html for SPA routing)
/api/*      → proxy_pass to backend:3001 (Docker DNS resolution)
             300s read/send timeout for complex queries
```

### Deployment Process
```bash
# 1. SSH to head node
ssh own3

# 2. Navigate to shared project directory
cd /shared/subhankar_v0

# 3. Deploy via Slurm batch job
sbatch deploy.sh

# deploy.sh runs on own7:
#   docker compose down    (stop existing containers)
#   docker compose up --build -d  (build + start fresh)
```

### Domain Routing
```
Browser → https://clinical-frontend.own7.aganitha.ai
       → own7 reverse proxy reads container name "clinical-frontend"
       → routes to port 80 of that container
       → nginx serves React app or proxies to backend
```

---

## 9. Project Structure

```
v0/
├── docker-compose.yml           ← Orchestrates frontend + backend containers
├── deploy.sh                    ← Slurm batch script for HPC deployment
├── DEPLOYMENT.md                ← Detailed deployment documentation
├── README.md                    ← Original project overview
├── PROJECT_README.md            ← This file (PPT reference)
│
├── backend/                     ← Node.js + Express API Server
│   ├── Dockerfile               ← node:20-slim container
│   ├── package.json             ← Express 5, pg, ts-node
│   ├── tsconfig.json            ← ESNext modules
│   └── src/
│       ├── index.ts             ← Express server (POST /api/search)
│       ├── agents/
│       │   └── QueryParser.ts   ← GPT-4o query extraction + cache
│       ├── db/
│       │   └── connection.ts    ← PostgreSQL pool (5 conn, SSL)
│       └── services/
│           ├── MeshService.ts   ← NCBI MeSH term resolution
│           └── QueryBuilder.ts  ← Dynamic SQL engine (750+ LOC)
│
├── frontend/                    ← React SPA
│   ├── Dockerfile               ← Multi-stage: build → nginx
│   ├── nginx.conf               ← SPA routing + API proxy
│   ├── package.json             ← React 19, Vite 8, Recharts
│   └── src/
│       ├── App.tsx              ← Main app + state + URL persistence
│       ├── main.tsx             ← React DOM entry
│       ├── index.css            ← Tailwind imports
│       └── components/
│           ├── Search.tsx       ← Search bar + filter panel
│           ├── ResultsTable.tsx ← Results table + pagination
│           ├── OverviewCharts.tsx ← 5 dashboard charts + heatmap
│           └── ThemeToggle.tsx  ← Dark/Light mode toggle
│
├── plan/                        ← Product specifications
├── backend_planning/            ← Backend architecture plans
├── frontend_planning/           ← Frontend component plans
├── database/                    ← Database schema plans
├── data-pipeline/               ← ETL pipeline plans
└── docs/                        ← Documentation index
```

---

## 10. Performance Optimizations

| Optimization | Impact |
|-------------|--------|
| **GPT-4o Response Caching** | Repeated queries skip AI call entirely (~1-3s saved + $0.01/call) |
| **Parallel DB Queries** | `Promise.all()` runs 5 queries simultaneously instead of sequentially |
| **CTE Materialization** | Summary queries capped at 5000 matching trials to prevent timeout |
| **Connection Pooling** | Max 5 PostgreSQL connections, 120s statement timeout |
| **Multi-Stage Docker Build** | Frontend image reduced from ~180 MB to ~45 MB |
| **Nginx Static Serving** | Pre-built JS/CSS served directly (no Node.js overhead) |
| **Server-Side Pagination** | Only 50 rows fetched per page (LIMIT/OFFSET at SQL level) |
| **MeSH Dual-Path Search** | Both original AND MeSH terms used in SQL for maximum recall |
| **Statistical Descendant Detection** | Pre-computes drug sub-terms via co-occurrence analysis |

---

## 11. External Services & APIs

| Service | What We Use It For | Cost |
|---------|--------------------|------|
| **OpenAI GPT-4o** | Parse natural language into structured JSON (conditions, drugs, phases, exclusions) | ~$0.01 per query (cached) |
| **NCBI E-Utilities** | Map common medical terms to official MeSH vocabulary | Free (NIH public API) |
| **NLM MeSH Lookup** | Fallback descriptor resolution when E-Utilities fails | Free (NIH public API) |
| **AACT Database** | PostgreSQL database with 500K+ clinical trials from ClinicalTrials.gov | Free (public, requires registration) |

---

## 12. User Interface Walkthrough

### Search Experience
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 [ Search trials targeting EGFR in oncology...  ] [Search]│
│     [Filter ▼]                                               │
├─────────────────────────────────────────────────────────────┤
│  When filter panel opens:                                    │
│  ┌──────────┬──────────────────────────────────────────┐    │
│  │ Phase    │  [Phase 1] [Phase 2] [✓ Phase 3] [Phase 4]│   │
│  │ Status   │                                           │    │
│  │ Interv.  │  Dynamic options from search results      │    │
│  │ Cond.    │                                           │    │
│  │ Sponsor  │                       [Apply Filters]     │    │
│  └──────────┴──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Charts
```
┌─────────────────────────────────────────────────────────────┐
│  CLINICAL INTELLIGENCE MATRIX (Disease × Drug Heatmap)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Drug1   Drug2   Drug3   Drug4   Drug5        │   │
│  │  Dis1   [P-II]  [P-III]  [P-I]    ·      ·         │   │
│  │  Dis2   [P-III]   ·     [P-II]  [P-I]    ·         │   │
│  │  Dis3    ·      [P-I]    ·      [P-III] [P-II]     │   │
│  └──────────────────────────────────────────────────────┘   │
│  Color = dominant trial phase | Click cell = phase breakdown │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │ Phase Dist.  │ │ Sponsor Types│                          │
│  │ ████ P-I     │ │ ████ Industry│                          │
│  │ ██████ P-II  │ │ ██ Academic  │                          │
│  │ ████ P-III   │ │ █ NIH        │                          │
│  └──────────────┘ └──────────────┘                          │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │ Top Diseases │ │ Top Drugs    │                          │
│  │ █████ NSCLC  │ │ █████ Pemb.  │                          │
│  │ ████ CRC     │ │ ████ Nivo.   │                          │
│  └──────────────┘ └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Results Table
```
┌─────────────────────────────────────────────────────────────┐
│  Search Intelligence Results — 1-50 of 1,247 results        │
│                                                              │
│  ┌─────────┬────────────────┬───────┬──────┬───────┬──────┐│
│  │ NCT ID  │ Study Title    │ Phase │ Date │Sponsor│Outcome││
│  ├─────────┼────────────────┼───────┼──────┼───────┼──────┤│
│  │NCT05...│ A Phase III... │ P-III │ 2024 │Merck  │ OS   ││
│  │         │ [NSCLC][Pemb.] │       │      │       │      ││
│  ├─────────┼────────────────┼───────┼──────┼───────┼──────┤│
│  │NCT04...│ Randomized...  │ P-II  │ 2023 │NIH    │ PFS  ││
│  │         │ [Melanoma][Niv]│       │      │       │      ││
│  └─────────┴────────────────┴───────┴──────┴───────┴──────┘│
│                                                              │
│  ◀ Previous  [1] [2] [3] [4] [5]  Next ▶                    │
└─────────────────────────────────────────────────────────────┘

Tags: purple = disease, green = drug, red = matched search term
Each row is expandable to show all diseases/drugs
```

---

## 13. How To Run Locally

### Prerequisites
- Node.js 20+
- npm
- OpenAI API key
- AACT database credentials

### Backend
```bash
cd backend
cp .env.example .env   # Add OPENAI_API_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm install
npm start              # Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Runs on http://localhost:5173 (proxied to backend)
```

### Docker (Production)
```bash
docker compose up --build -d
# Frontend: http://localhost:80
# Backend:  http://localhost:3001
```

---

## 14. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o query parsing |
| `DB_HOST` | Yes | AACT PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default: 5433) |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_NAME` | Yes | Database name |

---

## 15. Target Audience

| Audience | Use Case |
|----------|----------|
| **Clinical Strategy Teams** | Competitive landscaping across therapeutic areas |
| **Medical Affairs** | Tracking indication-specific trial activity and shifts |
| **BD & Licensing Teams** | Identifying acquisition targets and white-space opportunities |
| **Research Analysts** | Generating fast, defensible clinical evidence views |
| **Pharma Companies** | Understanding drug pipelines and trial phase distributions |

---

## 16. Summary — PPT Slide Reference

### Slide 1: Title
> **Clinical Intelligence Hub** — AI-Powered Search for 500K+ Clinical Trials

### Slide 2: Problem
> Existing clinical trial search is rigid, requires exact medical terms, and lacks intelligence. No charts, no AI understanding, no exclusion logic.

### Slide 3: Solution
> Natural language search powered by GPT-4o + MeSH medical vocabulary + AACT database. Type in plain English, get intelligent results with interactive visualizations.

### Slide 4: Architecture
> React frontend → Nginx proxy → Express backend → GPT-4o (parse) → NCBI MeSH (resolve) → PostgreSQL (search) → JSON response → Charts + Table

### Slide 5: Search Pipeline
> 5 stages: AI Parsing → MeSH Resolution → SQL Building → Parallel Execution → Rendering

### Slide 6: Key Features
> Natural language, MeSH resolution, 6-way filters, intelligence heatmap, 5 charts, exclusion logic, spelling correction, URL persistence, dark mode

### Slide 7: Tech Stack
> Frontend: React 19 + Vite 8 + Tailwind 4 + Recharts
> Backend: Express 5 + TypeScript + PostgreSQL (raw SQL)
> AI: GPT-4o + NCBI MeSH APIs
> Infra: Docker + Nginx + Slurm HPC

### Slide 8: Dashboard Demo
> Show the Clinical Intelligence Matrix (Disease × Drug heatmap), Phase Distribution, Sponsor Breakdown charts

### Slide 9: Deployment
> Docker Compose (2 containers) deployed on Slurm HPC cluster with NFS shared storage and automatic domain routing

### Slide 10: Performance
> Query caching, parallel DB execution, CTE optimization, multi-stage Docker builds, connection pooling, server-side pagination

---

*Generated from full codebase analysis of the Clinical Intelligence Hub project.*
