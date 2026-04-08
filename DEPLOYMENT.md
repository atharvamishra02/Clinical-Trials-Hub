# Clinical Intelligence Hub

> A full-stack clinical trials search platform powered by AI query parsing, MeSH term resolution, and the AACT clinical trials database. Deployed as Docker containers on a Slurm HPC cluster.

**Live URL:** [`https://clinical-frontend.own7.aganitha.ai`](https://clinical-frontend.own7.aganitha.ai)

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Search Pipeline (How a Query Works)](#4-search-pipeline)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [Project Structure](#7-project-structure)
8. [Infrastructure & Cluster](#8-infrastructure--cluster)
9. [Docker Configuration](#9-docker-configuration)
10. [Code Changes for Deployment](#10-code-changes-for-deployment)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Deployment Process](#12-deployment-process)
13. [Domain Routing](#13-domain-routing)
14. [Redeployment Quick Reference](#14-redeployment-quick-reference)
15. [Local Development](#15-local-development)
16. [Environment Variables](#16-environment-variables)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Application Overview

The Clinical Intelligence Hub lets users search **500,000+ clinical trials** from ClinicalTrials.gov using **natural language queries**. Instead of writing SQL or navigating complex filters, users type queries like:

> *"monoclonal antibodies in cardiovascular diseases except cancer"*

The system uses **GPT-4o** to parse intent, **NCBI MeSH** to resolve medical terminology, and builds optimized **SQL queries** against the AACT (Aggregate Analysis of ClinicalTrials.gov) PostgreSQL database.

### What Users See

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search Bar  "monoclonal antibodies in cardio..."        │
│  📊 Filter Panel  [Phase] [Status] [Sponsor] [Condition]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📈 DASHBOARD (5 charts)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ Phase Dist.  │ │ Top Diseases │ │ Top Drugs        │    │
│  │ ████ P-I     │ │ █████ CHF    │ │ █████ Rituximab  │    │
│  │ ██████ P-II  │ │ ████ CAD     │ │ ████ Trast.      │    │
│  │ ████ P-III   │ │ ███ HF       │ │ ███ Bev.         │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
│  ┌──────────────┐ ┌────────────────────────────────────┐   │
│  │ Sponsor Types│ │ Intelligence Matrix (Disease×Drug) │   │
│  │ ████ Industry│ │   Drug1  Drug2  Drug3  Drug4       │   │
│  │ ██ Academic  │ │ D1 [P2]  [P3]  [P1]   ·          │   │
│  │ █ NIH        │ │ D2 [P3]   ·   [P2]  [P1]         │   │
│  └──────────────┘ └────────────────────────────────────┘   │
│                                                             │
│  📋 RESULTS TABLE                                           │
│  ┌─────────┬──────────────────┬───────┬──────────┬───────┐ │
│  │ NCT ID  │ Study Title      │ Phase │ Sponsors │Outcome│ │
│  ├─────────┼──────────────────┼───────┼──────────┼───────┤ │
│  │NCT0001..│ A Phase II Trial │ P-II  │ Novartis │ OS,PFS│ │
│  │NCT0002..│ Randomized Study │ P-III │ NIH      │ MACE  │ │
│  └─────────┴──────────────────┴───────┴──────────┴───────┘ │
│  ◀ Page 1 of 24 ▶                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.4 | UI framework |
| Vite | 8.0.0 | Build tool + dev server |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.2 | Utility-first styling |
| Recharts | 3.8.0 | Data visualization (bar charts, heatmap) |
| Lucide React | 0.577.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 5.2.1 | HTTP server |
| Node.js | 20 | Runtime |
| TypeScript | 5.9.3 | Type safety |
| ts-node | 10.9.2 | Runtime TS compilation (no build step) |
| pg | 8.20.0 | PostgreSQL driver |
| OpenAI GPT-4o | — | Natural language query parsing |
| NCBI E-Utilities | — | MeSH medical term resolution |

### Infrastructure

| Technology | Version | Purpose |
|-----------|---------|---------|
| Docker | 25.0.2 | Containerization |
| Docker Compose | 2.24.5 | Multi-container orchestration |
| Nginx | Alpine | Static file serving + API proxy |
| Slurm | — | Job scheduler for HPC cluster |
| NFS | — | Shared filesystem across nodes |

### External Services

| Service | Endpoint | Purpose |
|---------|----------|---------|
| AACT Database | `aact-db.ctti-clinicaltrials.org:5432` | Clinical trials PostgreSQL DB |
| OpenAI API | `api.openai.com` | GPT-4o for query parsing |
| NCBI E-Utilities | `eutils.ncbi.nlm.nih.gov` | MeSH term search |
| NLM MeSH Lookup | `id.nlm.nih.gov/mesh/lookup` | MeSH descriptor fallback |

---

## 3. Architecture

### High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                               │
│  https://clinical-frontend.own7.aganitha.ai                         │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTPS (port 443)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    own7 REVERSE PROXY                                 │
│  Auto-discovers Docker containers via Docker socket                  │
│  Routes *.own7.aganitha.ai → container by name                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTP (port 80)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         DOCKER NETWORK                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              clinical-frontend (nginx:alpine)                │    │
│  │                                                              │    │
│  │   /            → serves React SPA (static HTML/JS/CSS)      │    │
│  │   /api/*       → reverse proxy to backend:3001              │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │ HTTP (port 3001)                      │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │              clinical-backend (node:20-slim)                  │    │
│  │                                                               │    │
│  │   POST /api/search                                            │    │
│  │     1. QueryParser  → GPT-4o (parse natural language)         │    │
│  │     2. MeshService  → NCBI API (resolve medical terms)        │    │
│  │     3. QueryBuilder → SQL (build + execute queries)           │    │
│  └───────────────┬──────────────┬────────────────────────────────┘   │
│                  │              │                                     │
└──────────────────┼──────────────┼─────────────────────────────────────┘
                   │              │
    ┌──────────────▼──┐   ┌──────▼──────────────────────────┐
    │   OpenAI API    │   │  AACT PostgreSQL Database        │
    │   (GPT-4o)      │   │  aact-db.ctti-clinicaltrials.org │
    │                 │   │  Schema: ctgov                    │
    │  + NCBI MeSH    │   │  500k+ trials, SSL connection    │
    │    E-Utilities   │   │  Pool: max 5 connections         │
    └─────────────────┘   └─────────────────────────────────┘
```

### Request Flow Diagram

```
User types: "monoclonal antibodies in cardiovascular diseases except cancer"
                                    │
                                    ▼
         ┌──────────────────────────────────────────┐
         │         1. QUERY PARSING (GPT-4o)         │
         │                                           │
         │  Input:  Natural language string           │
         │  Output: Structured JSON                   │
         │  {                                         │
         │    "conditions": ["cardiovascular          │
         │                    diseases"],              │
         │    "interventions": ["monoclonal           │
         │                      antibodies"],          │
         │    "excluded_terms": ["cancer"],            │
         │    "phases": [],                            │
         │    "statuses": [],                          │
         │    "is_active": null                        │
         │  }                                         │
         │                                            │
         │  Cache: .query_cache.json (avoids re-call) │
         └────────────────────┬─────────────────────-─┘
                              │
                              ▼
         ┌──────────────────────────────────────────┐
         │      2. MESH RESOLUTION (NCBI API)        │
         │                                           │
         │  "cardiovascular diseases"                 │
         │       → MeSH: "Cardiovascular Diseases"    │
         │                                            │
         │  "monoclonal antibodies"                   │
         │       → MeSH: "Antibodies, Monoclonal"     │
         │                                            │
         │  "cancer" (excluded)                       │
         │       → MeSH: "Neoplasms"                  │
         │                                            │
         │  How: E-Utilities esearch → extract term   │
         │  Fallback: NLM descriptor lookup API       │
         └────────────────────┬──────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────┐
         │       3. SQL QUERY BUILDING               │
         │                                           │
         │  Builds WHERE clauses from:               │
         │   • Conditions (title ILIKE + MeSH match) │
         │   • Interventions (name ILIKE + MeSH)     │
         │   • Excluded terms (NOT IN conditions     │
         │     AND NOT IN interventions)              │
         │   • Phases, Statuses, Sponsors            │
         │   • Manual UI filters (override AI)       │
         │                                           │
         │  JOINs across 6+ AACT tables              │
         └────────────────────┬──────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────┐
         │     4. PARALLEL QUERY EXECUTION           │
         │                                           │
         │  ┌────────────────────────────────────┐   │
         │  │  Promise.all([                     │   │
         │  │    data query (50 rows + count),   │   │
         │  │    phase distribution,             │   │
         │  │    top 10 diseases,                │   │
         │  │    top 10 drugs,                   │   │
         │  │    sponsor types,                  │   │
         │  │    disease×drug×phase matrix       │   │
         │  │  ])                                │   │
         │  └────────────────────────────────────┘   │
         │                                           │
         │  Pool: 5 concurrent DB connections         │
         │  Timeout: 120s per statement               │
         └────────────────────┬──────────────────────┘
                              │
                              ▼
         ┌──────────────────────────────────────────┐
         │         5. JSON RESPONSE                  │
         │                                           │
         │  {                                        │
         │    rows: [{nct_id, title, phase, ...}],   │
         │    totalCount: 1247,                      │
         │    summary: {                             │
         │      phases: [{name, count}],             │
         │      diseases: [{name, count}],           │
         │      drugs: [{name, count}],              │
         │      sponsors: [{name, count}],           │
         │      relationships: [{disease, drug,      │
         │                       phase, count}]      │
         │    },                                     │
         │    filteredSummary: { ... }                │
         │  }                                        │
         └──────────────────────────────────────────┘
```

---

## 4. Search Pipeline

### End-to-End Flow (with real example)

**User Query:** `"active trials for lung cancer with pembrolizumab in phase 3"`

```
Step 1: GPT-4o Extraction
─────────────────────────
  conditions:    ["lung cancer"]
  interventions: ["pembrolizumab"]
  phases:        ["Phase 3"]
  is_active:     true
  excluded:      []

Step 2: MeSH Resolution
───────────────────────
  "lung cancer"     → NCBI → "Lung Neoplasms"
  "pembrolizumab"   → NCBI → "Pembrolizumab"

Step 3: SQL WHERE Clauses Built
────────────────────────────────
  WHERE (
    -- Condition matches (original term OR MeSH)
    s.brief_title ILIKE '%lung cancer%'
    OR bc.mesh_term ILIKE '%Lung Neoplasms%'
    OR c.name ILIKE '%lung cancer%'
  )
  AND (
    -- Intervention matches
    i.name ILIKE '%pembrolizumab%'
    OR bi.mesh_term ILIKE '%Pembrolizumab%'
  )
  AND s.phase ILIKE '%Phase 3%'
  AND s.overall_status IN ('Recruiting','Active, not recruiting',
                           'Enrolling by invitation','Available')

Step 4: Execute 7 queries in parallel
──────────────────────────────────────
  [1] Main data  → 50 rows (page 1)
  [2] COUNT(*)   → total matching trials
  [3] Phase dist → {"Phase 3": 412, "Phase 2": 8, ...}
  [4] Diseases   → [{name: "Lung Neoplasms", count: 320}, ...]
  [5] Drugs      → [{name: "Pembrolizumab", count: 412}, ...]
  [6] Sponsors   → [{name: "Industry", count: 280}, ...]
  [7] Matrix     → [{disease, drug, phase, count}, ...]

Step 5: Response → Frontend renders charts + table
```

### Query Caching Strategy

```
  User types "lung cancer pembrolizumab"
           │
           ▼
  ┌─────────────────────────┐     ┌──────────────────────┐
  │ Check .query_cache.json │────▶│ Cache HIT?           │
  │ (file-based cache)      │     │                      │
  └─────────────────────────┘     │  YES → return cached │
                                  │         JSON, skip   │
                                  │         GPT-4o call  │
                                  │                      │
                                  │  NO  → call GPT-4o,  │
                                  │         save to cache│
                                  └──────────────────────┘

  Why: Each GPT-4o call costs ~$0.01 and takes 1-3s.
       Repeated searches skip the API entirely.
```

---

## 5. Backend Deep Dive

### 5.1 Express Server (`backend/src/index.ts`)

Single endpoint serving the entire search API:

```
POST /api/search
  Body: { query: string, page: number, limit: number, filters: object }

  Pipeline:
    1. parseQuery(query)           → GPT-4o extracts structured intent
    2. resolveMesh(conditions)     → NCBI resolves condition MeSH terms
    3. resolveMesh(interventions)  → NCBI resolves intervention MeSH terms
    4. resolveMesh(excluded_terms) → NCBI resolves exclusion MeSH terms
    5. buildAndExecuteQuery(...)   → SQL execution + summary aggregation
    6. Return JSON response
```

**Middleware:** CORS enabled, Express JSON body parser

### 5.2 QueryParser (`backend/src/agents/QueryParser.ts`)

The AI brain of the application. Sends the user's natural language query to GPT-4o with a detailed system prompt.

**Key System Prompt Rules:**
| Rule | Description |
|------|-------------|
| Spelling correction | `"keratoconos"` → `"keratoconus"` |
| No normalization | Keep `"lung cancer"` as-is — don't convert to `"Lung Neoplasms"` |
| Excluded terms | Keep user's exact term (e.g., `"cancer"`). MeSH handles resolution |
| Phase mapping | `"phase 3"` → `"Phase 3"`, `"early phase"` → `"Early Phase 1"` |
| Active detection | `"active trials"`, `"ongoing"`, `"recruiting"` → `is_active: true` |
| Empty fields | Return `[]` not `null` for missing fields |

**Error Handling:**
- 429 Rate Limit → Exponential backoff (2s → 4s → 8s), 3 retries
- Invalid JSON from GPT → Falls back to empty extraction
- Cache miss → Call API then persist to `.query_cache.json`

### 5.3 MeshService (`backend/src/services/MeshService.ts`)

Resolves plain-English medical terms to standardized MeSH vocabulary:

```
  Input: "lung cancer"
    │
    ▼
  ┌─────────────────────────────────────────────┐
  │ Step 1: NCBI E-Utilities esearch            │
  │ GET eutils.ncbi.nlm.nih.gov/entrez/eutils/  │
  │     esearch.fcgi?db=mesh&term=lung+cancer    │
  │                                              │
  │ Returns: MeSH UID list                       │
  └──────────────────┬──────────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────────┐
  │ Step 2: Extract MeSH descriptor name        │
  │ Parse: "lung neoplasms"[MeSH Terms]         │
  │ Result: "Lung Neoplasms"                     │
  └──────────────────┬──────────────────────────┘
                     │ (if Step 1 fails)
                     ▼
  ┌─────────────────────────────────────────────┐
  │ Fallback: NLM Descriptor Lookup             │
  │ GET id.nlm.nih.gov/mesh/lookup/descriptor   │
  │     ?label=lung+cancer&match=contains        │
  │                                              │
  │ Returns: Descriptor name directly            │
  └─────────────────────────────────────────────┘
```

### 5.4 QueryBuilder (`backend/src/services/QueryBuilder.ts`)

The 750+ line SQL engine. Builds dynamic queries across 6+ AACT database tables.

**AACT Database Tables Used:**

```
  ctgov.studies (s)              ← Main table: nct_id, title, phase, status
      │
      ├── ctgov.conditions (c)          ← Disease/condition names
      ├── ctgov.browse_conditions (bc)  ← MeSH-mapped conditions
      ├── ctgov.interventions (i)       ← Drug/treatment names + types
      ├── ctgov.browse_interventions (bi)← MeSH-mapped interventions
      ├── ctgov.sponsors (sp)           ← Lead sponsors + agency class
      └── ctgov.design_outcomes (do)    ← Primary/secondary outcomes
```

**How Exclusion Terms Work:**

```
  User: "cardiovascular diseases except cancer"
              │
              ▼
  excluded_terms: ["cancer"]
  excluded MeSH:  ["Neoplasms"]
              │
              ▼
  SQL adds:
    AND s.nct_id NOT IN (
      SELECT nct_id FROM ctgov.conditions
      WHERE name ILIKE '%cancer%'
    )
    AND s.nct_id NOT IN (
      SELECT nct_id FROM ctgov.browse_conditions
      WHERE mesh_term ILIKE '%Neoplasms%'
    )
```

**Filter Override Logic:**

```
  AI-parsed filters (automatic from query text)
      │
      │   +   Manual UI filters (user clicks checkboxes)
      │         │
      ▼         ▼
  ┌─────────────────────────────────────────┐
  │ base_clauses   +   manual_clauses       │
  │ (from GPT-4o)      (from filter panel)  │
  │                                         │
  │ Manual filters OVERRIDE AI filters      │
  │ for the same category                   │
  └─────────────────────────────────────────┘
```

---

## 6. Frontend Deep Dive

### 6.1 Component Tree

```
  App.tsx
  ├── ThemeToggle.tsx        ← Dark/Light mode switch (localStorage)
  ├── Search.tsx             ← Search bar + filter panel
  │   ├── Search input       ← Natural language query box
  │   └── Filter panel       ← Floating panel with 5 tabs:
  │       ├── Phase          ← EP1, P1, P2, P3, P4
  │       ├── Status         ← Recruiting, Completed, Active...
  │       ├── Intervention   ← Dynamic from summary.drugs
  │       ├── Condition      ← Dynamic from summary.diseases
  │       └── Sponsor        ← Industry, Academic, NIH, Other
  │
  ├── OverviewCharts.tsx     ← 5 dashboard visualizations
  │   ├── Intelligence Matrix  ← Disease × Drug heatmap
  │   ├── Phase Distribution   ← Horizontal bar chart
  │   ├── Disease Prevalence   ← Top 10 diseases bar chart
  │   ├── Active Interventions ← Top 10 drugs bar chart
  │   └── Lead Sponsor Types   ← Sponsor breakdown bar chart
  │
  └── ResultsTable.tsx       ← Paginated trial results
      ├── Table rows          ← NCT ID, title, phase, sponsors, outcomes
      ├── Status badges       ← Color-coded (green=recruiting, etc.)
      └── Pagination          ← Page numbers + prev/next buttons
```

### 6.2 State Management

```
  App.tsx state:
  ┌──────────────────────────────────────────────────────────┐
  │  trials[]         ← Current page of search results       │
  │  isLoading        ← Shows spinner during API call         │
  │  hasSearched      ← Toggles hero → results view          │
  │  page             ← Current page number                   │
  │  totalPages       ← Calculated from totalCount / 50      │
  │  totalCount       ← Total matching trials                 │
  │  lastQuery        ← Last search text (for pagination)     │
  │  lastFilters      ← Last applied filters (for pagination) │
  │  summary          ← Chart data (phases, diseases, drugs)  │
  │  filteredSummary  ← Chart data after manual filters       │
  └──────────────────────────────────────────────────────────┘
```

### 6.3 URL Persistence

The app preserves search state in the browser URL for shareability:

```
  User searches → URL becomes:
  https://.../?q=lung+cancer&page=2&filters=eyJQaGFzZSI6WyJQaGFzZSAzIl19

  On page load → App reads URL params:
    q       → restores search query
    page    → restores page number
    filters → base64-decoded JSON → restores filter selections

  Browser back/forward → works correctly
```

### 6.4 Chart Visualizations

| Chart | Data Source | Library | Colors |
|-------|------------|---------|--------|
| Intelligence Matrix | `relationships[]` | Custom CSS Grid | Phase-based: P1=blue, P2=cyan, P3=green, P4=yellow |
| Phase Distribution | `phases[]` | Recharts BarChart | Per-phase color coding |
| Disease Prevalence | `diseases[]` (top 10) | Recharts BarChart | Purple gradient |
| Active Interventions | `drugs[]` (top 10) | Recharts BarChart | Emerald gradient |
| Lead Sponsor Types | `sponsors[]` | Recharts BarChart | Pink gradient |

### 6.5 Theme System

```
  ThemeToggle.tsx:
    1. Check localStorage for saved theme
    2. If none → use system preference (prefers-color-scheme)
    3. Toggle adds/removes .dark class on <html>
    4. Tailwind dark: variants activate automatically
    5. Sun ☀️ / Moon 🌙 icon from lucide-react
```

---

## 7. Project Structure

```
v0/
├── docker-compose.yml          ← Orchestrates both containers
├── deploy.sh                   ← Slurm batch job script
├── DEPLOYMENT.md               ← This file
├── README.md                   ← Project overview
│
├── backend/
│   ├── Dockerfile              ← Node 20 container
│   ├── .dockerignore           ← Excludes .env, node_modules
│   ├── .env                    ← Secrets (NOT in Docker image)
│   ├── package.json            ← Express 5, pg, openai, ts-node
│   ├── tsconfig.json           ← ESNext + NodeNext modules
│   └── src/
│       ├── index.ts            ← Express server, POST /api/search
│       ├── agents/
│       │   └── QueryParser.ts  ← GPT-4o query → JSON extraction
│       ├── db/
│       │   └── connection.ts   ← PostgreSQL pool (5 conn, SSL)
│       └── services/
│           ├── MeshService.ts  ← NCBI MeSH term resolution
│           └── QueryBuilder.ts ← SQL builder (750+ LOC)
│
├── frontend/
│   ├── Dockerfile              ← Multi-stage: Node build → Nginx
│   ├── .dockerignore           ← Excludes node_modules, dist
│   ├── nginx.conf              ← SPA routing + API proxy
│   ├── package.json            ← React 19, Vite 8, Recharts
│   ├── index.html              ← Entry HTML
│   ├── vite.config.ts          ← React + Tailwind plugins
│   ├── tsconfig.json           ← Project references
│   ├── tsconfig.app.json       ← App TS config (strict)
│   └── src/
│       ├── main.tsx            ← React DOM render
│       ├── App.tsx             ← Main app + search logic
│       ├── index.css           ← Tailwind imports + scrollbar
│       └── components/
│           ├── Search.tsx      ← Search bar + filter panel
│           ├── ResultsTable.tsx← Results table + pagination
│           ├── OverviewCharts.tsx ← 5 dashboard charts
│           └── ThemeToggle.tsx ← Dark/light mode
│
├── plan/                       ← Product specs
│   ├── prompt.md               ← Use cases, example queries
│   └── prompt2.md              ← Functional specification
│
├── backend_planning/           ← Backend architecture plans
├── frontend_planning/          ← Frontend component plans
├── database/                   ← DB schema plans
├── data-pipeline/              ← ETL pipeline plans
└── docs/                       ← Documentation index
```

---

## 8. Infrastructure & Cluster

### Cluster Layout

```
                          INTERNET
                             │
                             │ HTTPS (*.own7.aganitha.ai)
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │                    own7 (10.100.0.7)                  │
  │               Compute Node + Reverse Proxy            │
  │                                                       │
  │  ┌─────────────┐  ┌──────────────────────────────┐   │
  │  │ Rev. Proxy   │  │ Docker Engine                │   │
  │  │ Manager      │──│  ├── clinical-frontend :80   │   │
  │  │ (port 443)   │  │  └── clinical-backend  :3001 │   │
  │  └─────────────┘  └──────────────────────────────┘   │
  └──────────────────────────────────────────────────────┘
                             ▲
                             │ Slurm job (sbatch)
  ┌──────────────────────────┼───────────────────────────┐
  │                    own3 (10.100.0.2)                  │
  │               Slurm Head Node                         │
  │                                                       │
  │  SSH from local machine (port 2322)                   │
  │  sbatch → dispatches jobs to own7                     │
  │  ~/v0/ → local copy of project                        │
  └──────────────────────────────────────────────────────┘
                             ▲
                             │ NFS mount
  ┌──────────────────────────┼───────────────────────────┐
  │                    own5 (NFS Server)                   │
  │                                                       │
  │  Exports /data → mounted as /shared on all nodes      │
  │  /shared/subhankar_v0/ ← project files (all nodes     │
  │                           can read/write)              │
  └──────────────────────────────────────────────────────┘
```

### SSH Configuration

```bash
# ~/.ssh/config
Host own3
    HostName own3.aganitha.ai
    Port 2322
    User subhankar
```

### Why `/shared` Instead of `~/`

```
  ❌  own3:~/v0/deploy.sh   → Slurm runs on own7
                                own7 CANNOT see own3's home dir
                                Job fails: "No such file"

  ✅  /shared/subhankar_v0/  → NFS mount from own5
                                Visible from own3, own7, own8...
                                Job succeeds!
```

### Key Infrastructure Commands

```bash
# SSH to head node
ssh own3

# Check cluster status
sinfo                    # Node states (idle/mix/alloc)
squeue -u subhankar      # Your running/pending jobs

# Docker on own7 (via Slurm)
# Direct SSH to own7 is not available — use Slurm jobs

# Verify shared filesystem
ls /shared/subhankar_v0/  # Should show project files
```

---

## 9. Docker Configuration

### 9.1 Backend Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
```

**Design decisions:**

| Choice | Why |
|--------|-----|
| `node:20-slim` | Smaller than `node:20` (~180MB vs ~350MB), has everything needed |
| `npm ci` | Deterministic install from lockfile (not `npm install`) |
| `COPY package*.json` first | Docker layer caching — deps only reinstall when package.json changes |
| `node --loader ts-node/esm` | Runtime TS compilation — no separate build step needed |
| No `--env-file` flag | `.env` excluded from image; vars injected by Docker Compose `env_file` |

### 9.2 Frontend Dockerfile (Multi-Stage)

```dockerfile
# ── Stage 1: Build ──────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build     # tsc -b && vite build → /app/dist

# ── Stage 2: Serve ──────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why multi-stage:**

```
  Stage 1 (build):         Stage 2 (production):
  ┌────────────────┐       ┌──────────────────┐
  │ node:20-slim   │       │ nginx:alpine     │
  │ ~180MB         │       │ ~40MB            │
  │                │       │                  │
  │ node_modules/  │       │ dist/            │
  │ src/           │  ──▶  │   index.html     │
  │ package.json   │ COPY  │   assets/        │
  │ tsconfig.json  │ dist  │     *.js, *.css  │
  │ dist/          │       │ nginx.conf       │
  └────────────────┘       └──────────────────┘
  (discarded)              (final image ~45MB)
```

### 9.3 Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: all routes → index.html (React handles routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API: proxy to backend container
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;      # complex queries can take 2min+
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
    }
}
```

**How the proxy works:**

```
  Browser request: GET /api/search
       │
       ▼
  Nginx sees /api/ prefix
       │
       ▼
  Proxy to http://backend:3001/api/search
       │
       │  "backend" resolves via Docker Compose DNS
       │  to the backend container's internal IP
       ▼
  Backend Express receives request, processes, responds
```

### 9.4 Docker Compose

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    container_name: clinical-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    ports:
      - "3001:3001"
    labels:
      description: "Clinical Trials Backend API"
      user: "subhankar"
      port: "3001"

  frontend:
    build: ./frontend
    container_name: clinical-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    labels:
      description: "Clinical Trials Search UI"
      user: "subhankar"
      port: "80"
```

**Label system for auto-discovery:**

```
  Docker container created with labels:
    description: "Clinical Trials Search UI"
    user: "subhankar"
    port: "80"
         │
         ▼
  own7 Reverse Proxy Manager watches Docker socket
    → Detects new container "clinical-frontend"
    → Reads labels (description, user, port)
    → Registers route:
         clinical-frontend.own7.aganitha.ai → port 80
         │
         ▼
  DNS wildcard *.own7.aganitha.ai → 10.100.0.7
    → Browser reaches reverse proxy → routes to container
```

### 9.5 `.dockerignore` Files

**Backend:**
```
node_modules          ← Reinstalled inside container
npm-debug.log         ← Debug artifact
.env                  ← SECURITY: secrets not baked into image
.query_cache.json     ← Stale cache from dev
```

**Frontend:**
```
node_modules          ← Reinstalled inside container
npm-debug.log         ← Debug artifact
dist                  ← Will be rebuilt inside container
```

---

## 10. Code Changes for Deployment

### 10.1 API URL: Localhost → Relative Path

```diff
  // frontend/src/App.tsx
- const response = await fetch('http://localhost:3001/api/search', {
+ const response = await fetch('/api/search', {
```

**Why this matters:**

```
  LOCAL DEV:
    Browser → http://localhost:5173 (Vite dev server)
    API     → http://localhost:3001/api/search ✅ (backend on same machine)

  DOCKER PRODUCTION:
    Browser → https://clinical-frontend.own7.aganitha.ai
    API     → http://localhost:3001/api/search ❌ (nothing on user's port 3001!)
    API     → /api/search ✅ (nginx proxies to backend container)
```

### 10.2 TypeScript Strict Build Fixes

```diff
  // frontend/src/components/OverviewCharts.tsx
- const PHASE_KEYS = [...]     // declared but never used
- const capitalize = (s) => .. // declared but never used
  // Removed both — tsc -b in Docker enforces no unused variables
```

**Why this only fails in Docker:**

```
  Local dev (npm run dev):
    Vite → serves files with esbuild → ignores TS errors → works ✅

  Docker build (npm run build):
    Step 1: tsc -b → full TypeScript check → FAILS on unused vars ❌
    Step 2: vite build → (never reached)
```

---

## 11. Performance Optimizations

### 11.1 Database Connection Pool

```
  BEFORE (caused timeout):          AFTER (optimized):
  ┌────────────────────┐            ┌────────────────────────────┐
  │ max: 1             │            │ max: 5                     │
  │                    │            │ idleTimeoutMillis: 30000   │
  │ All 7 queries      │            │ statement_timeout: 120000  │
  │ run ONE AT A TIME  │            │                            │
  │                    │            │ 5 queries run in PARALLEL  │
  │ Total: 7 × 20s     │            │ Total: max(20s) ≈ 25s     │
  │      = 140s ❌     │            │                     ✅     │
  └────────────────────┘            └────────────────────────────┘
```

**Connection pool evolution:**

| Stage | `max` | Reason |
|-------|-------|--------|
| Default | 10 | PostgreSQL default — caused "too many connections" |
| Fix #1 | 1 | Stopped errors but serialized everything |
| Fix #2 | 3 | Better, but still bottlenecked on 5+ queries |
| Final | **5** | Optimal for AACT's connection limit + query parallelism |

### 11.2 Query Parallelization

```
  BEFORE (sequential):              AFTER (Promise.all):
  ┌─────────────┐                   ┌─────────────┐
  │ phase query  │ 15s              │ phase query  │──┐
  ├─────────────┤                   │ disease qry  │──┤
  │ disease qry  │ 20s              │ drug query   │──┤ max(20s)
  ├─────────────┤                   │ sponsor qry  │──┤  ≈ 20s
  │ drug query   │ 18s              │ matrix query │──┤
  ├─────────────┤                   └──────────────┘  │
  │ sponsor qry  │ 12s                                ▼
  ├─────────────┤                   All complete!
  │ matrix query │ 20s
  └─────────────┘
  Total: 85s ❌                     Total: ~20s ✅
```

### 11.3 Timeout Configuration

```
  REQUEST JOURNEY & TIMEOUTS:

  Browser ──(no limit)──▶ Reverse Proxy ──(?)──▶ Nginx ──(300s)──▶ Backend ──(120s)──▶ DB
                                                  │                  │                  │
                                            proxy_read:300s   statement:120s    query execution
                                            proxy_send:300s
                                            proxy_conn:30s

  If a query takes > 120s → DB kills it (statement_timeout)
  If total takes > 300s  → Nginx kills connection (proxy_read_timeout)
```

---

## 12. Deployment Process

### Overview

```
  LOCAL MACHINE                    own3 (HEAD)                    own7 (COMPUTE)
  ┌───────────┐    rsync          ┌───────────┐   Slurm job      ┌───────────────┐
  │ ~/v0/     │ ──────────────▶   │ ~/v0/     │ ─────────────▶   │ /shared/      │
  │ (source)  │  SSH:2322         │ (staging) │   sbatch          │ subhankar_v0/ │
  └───────────┘                   └─────┬─────┘                   │               │
                                        │ rsync                   │ docker compose│
                                        ▼                         │ up --build -d │
                                  /shared/                        │               │
                                  subhankar_v0/                   │ ┌──────────┐  │
                                  (NFS shared)                    │ │frontend  │  │
                                                                  │ │:80       │  │
                                                                  │ ├──────────┤  │
                                                                  │ │backend   │  │
                                                                  │ │:3001     │  │
                                                                  │ └──────────┘  │
                                                                  └───────────────┘
```

### Step 1: Sync Code to own3

```bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='.query_cache.json' \
  -e 'ssh -o ConnectTimeout=15 -o ServerAliveInterval=5' \
  /Users/subhankar/Downloads/v0/ own3:~/v0/
```

| Flag | Purpose |
|------|---------|
| `-a` | Archive mode (preserves permissions, timestamps, symlinks) |
| `-v` | Verbose output |
| `-z` | Compress during transfer |
| `--exclude` | Skip `node_modules` (rebuilt in Docker) and cache files |
| `-e 'ssh ...'` | SSH options for unreliable connection |

### Step 2: Copy to Shared Filesystem

```bash
ssh own3 'rsync -a ~/v0/ /shared/subhankar_v0/'
```

> **Why two rsync hops?** Local → own3 home dir (fast local SSD) → /shared/ (NFS). This is faster than writing directly to NFS from outside.

### Step 3: Submit Slurm Job

```bash
ssh own3 'sbatch /shared/subhankar_v0/deploy.sh'
# Output: Submitted batch job 26347
```

**Slurm job script (`deploy.sh`):**

```bash
#!/bin/bash
#SBATCH --job-name=clinical-deploy
#SBATCH --partition=pzero           # General purpose partition
#SBATCH --nodelist=own7             # MUST run on own7 (has reverse proxy)
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4           # 4 CPUs for Docker build
#SBATCH --mem=8G                    # 8GB RAM for npm ci + build
#SBATCH --time=00:10:00             # 10 min max (usually ~30s)
#SBATCH --output=/shared/subhankar_v0/deploy_%j.log

echo "=== Starting deployment on $(hostname) ==="
cd /shared/subhankar_v0

docker compose down 2>/dev/null || true    # Stop old containers
docker compose up --build -d               # Build + start new ones

echo "=== Container status ==="
docker ps --filter name=clinical
echo "=== Deployment complete ==="
```

| SBATCH Flag | Value | Why |
|-------------|-------|-----|
| `--partition` | `pzero` | General purpose (not GPU or CPU-only) |
| `--nodelist` | `own7` | Containers must run here for domain routing |
| `--cpus-per-task` | `4` | Enough for parallel `npm ci` + Docker build |
| `--mem` | `8G` | `npm ci` + `vite build` can use 2-4GB |
| `--time` | `10:00` | Safety limit; actual build takes ~30s cached |
| `--output` | `/shared/.../deploy_%j.log` | Readable from own3 (%j = job ID) |

### Step 4: Monitor Deployment

```bash
# Check if job is still running
ssh own3 'squeue -u subhankar'

# Read the deployment log (after job completes)
ssh own3 'cat /shared/subhankar_v0/deploy_26347.log | tail -15'
```

**Expected successful output:**
```
=== Starting deployment on own7 ===
[+] Building 12.3s (18/18) FINISHED
[+] Running 2/2
 ✔ Container clinical-backend   Started
 ✔ Container clinical-frontend  Started
=== Container status ===
NAMES                STATUS
clinical-frontend    Up 2 seconds
clinical-backend     Up 3 seconds
=== Deployment complete ===
```

---

## 13. Domain Routing

### How Your App Gets a URL

```
  Step 1: Docker container starts on own7 with labels
          container_name: clinical-frontend
          labels: { description, user, port: "80" }
               │
               ▼
  Step 2: own7's Reverse Proxy Manager watches Docker socket
          Detects: "new container clinical-frontend on port 80"
               │
               ▼
  Step 3: Wildcard DNS  *.own7.aganitha.ai → 10.100.0.7
          clinical-frontend.own7.aganitha.ai resolves to own7
               │
               ▼
  Step 4: Browser hits own7:443 with Host: clinical-frontend.own7.aganitha.ai
          Reverse Proxy matches container name → forwards to port 80
               │
               ▼
  Step 5: Nginx in clinical-frontend serves the React app ✅
```

### Why `*.own3.aganitha.ai` Shows 404

```
  ✅ clinical-frontend.own7.aganitha.ai
     → own7's proxy → finds container on own7's Docker → works!

  ❌ clinical-frontend.own3.aganitha.ai
     → own3's proxy → checks own3's Docker → no container found → 404!
     "No proxy target found for host: clinical-frontend.own3.aganitha.ai"
```

> **Rule:** The domain suffix must match the node where containers run. Containers on own7 → `*.own7.aganitha.ai`.

---

## 14. Redeployment Quick Reference

After making code changes locally, redeploy in 3 commands:

```bash
# 1. Sync local changes → own3
rsync -avz --exclude='node_modules' --exclude='.query_cache.json' \
  -e 'ssh -o ConnectTimeout=15 -o ServerAliveInterval=5' \
  /Users/subhankar/Downloads/v0/ own3:~/v0/

# 2. Copy to shared FS + submit Slurm job
ssh own3 'rsync -a ~/v0/ /shared/subhankar_v0/ && sbatch /shared/subhankar_v0/deploy.sh'

# 3. Monitor (wait ~30s for Docker build)
ssh own3 'squeue -u subhankar'
ssh own3 'cat /shared/subhankar_v0/deploy_<JOB_ID>.log | tail -15'
```

---

## 15. Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- A `.env` file in `backend/` with valid credentials

### Running Locally

```bash
# Terminal 1: Backend
cd backend
npm install
npm start                    # Starts on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

> **Note:** For local dev, change the API URL in `App.tsx` back to `http://localhost:3001/api/search`. The relative `/api/search` only works behind nginx in Docker.

### Common Local Issues

| Issue | Fix |
|-------|-----|
| `@tailwindcss/vite` ERESOLVE | Bump to `@tailwindcss/vite@^4.2.2` in package.json |
| "Cannot find native binding" (rolldown) | `rm -rf node_modules package-lock.json && npm install` |
| Backend "too many connections" | Reduce `max` in `connection.ts` to 3 or lower |

---

## 16. Environment Variables

### `backend/.env`

```
OPENAI_API_KEY=sk-...         # GPT-4o for query parsing
DB_HOST=aact-db.ctti-clinicaltrials.org
DB_PORT=5432
DB_USER=mishraatharva
DB_PASSWORD=...               # AACT database password
DB_NAME=aact
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o query parsing |
| `DB_HOST` | Yes | PostgreSQL host (AACT cloud database) |
| `DB_PORT` | Yes | PostgreSQL port (default: 5432) |
| `DB_USER` | Yes | Database role username |
| `DB_PASSWORD` | Yes | Database role password |
| `DB_NAME` | Yes | Database name (`aact`) |

> **Security:** The `.env` file is in `.dockerignore` — it is NOT baked into the Docker image. Docker Compose injects these at runtime via the `env_file` directive.

---

## 17. Troubleshooting

### Quick Diagnostic

```
  Problem?
     │
     ├── 504 Gateway Timeout ──▶ Query too slow
     │     Fix: Increase proxy_read_timeout in nginx.conf
     │     Fix: Check DB pool (max:5) and parallelization
     │
     ├── "too many connections" ──▶ Pool too large
     │     Fix: Reduce max in connection.ts
     │
     ├── 404 on *.own3.aganitha.ai ──▶ Wrong domain
     │     Fix: Use *.own7.aganitha.ai (where containers run)
     │
     ├── Container not getting domain ──▶ Missing labels
     │     Fix: Add description, user, port labels to docker-compose
     │
     ├── Frontend build fails in Docker ──▶ TS errors
     │     Fix: Run npm run build locally to catch errors
     │     (tsc -b is strict, Vite dev mode is not)
     │
     ├── "Cannot find native binding" ──▶ npm cache issue
     │     Fix: rm -rf node_modules package-lock.json && npm install
     │
     ├── Slurm job PENDING ──▶ Node busy
     │     Fix: sinfo to check node states
     │     Fix: squeue to see who's using own7
     │
     └── "No such file" in Slurm job ──▶ Path not on NFS
           Fix: Ensure files are in /shared/ (not ~/home)
```

### Detailed Troubleshooting Table

| Issue | Error Message | Root Cause | Solution |
|-------|--------------|------------|----------|
| Timeout | `504 Gateway Timeout` | Query > nginx timeout | Increase `proxy_read_timeout` to 300s+ |
| DB Connection | `too many connections for role` | Pool `max` exceeds role limit | Lower pool `max` (currently 5) |
| Wrong Domain | `No proxy target found for host` | Containers on different node | Use `*.own7.aganitha.ai` not `*.own3` |
| No Domain | Container runs but no URL | Missing Docker labels | Add `description`, `user`, `port` labels |
| Build Fail | `TS2454: Variable is used before assigned` | Unused vars in strict mode | Remove unused variables, run `tsc -b` locally |
| npm Error | `Cannot find native binding` | Corrupted optional deps | Delete `node_modules` + `package-lock.json`, reinstall |
| Slurm Stuck | Job shows `PENDING` | Node is busy/down | `sinfo` to check, try different `--nodelist` |
| File Missing | `cd: no such file` in Slurm log | Files in home dir, not `/shared` | `rsync ~/v0/ /shared/subhankar_v0/` |
| API 404 | `fetch('/api/search')` → 404 | Nginx not proxying | Check `nginx.conf` has `location /api/` block |
| CORS Error | `Access-Control-Allow-Origin` | Missing CORS middleware | Backend has `cors()` middleware — check it's loaded |
