# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TA Intelligence Cockpit — an airline-style Talent Acquisition dashboard with RAG-scored metric tiles, filters, and an AI chat advisor. Built with React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4, deployed on Vercel with Edge Functions.

## Commands

```bash
# Development — MUST use vercel dev (not vite) so /api/* Edge routes are available
vercel dev

# Build (typecheck + production bundle)
npm run build

# Lint
npm run lint

# Tests
npm test              # run once
npm run test:watch    # watch mode
npx vitest run src/features/cockpit/runtime-data/filters.test.ts   # single test file

# Data & RAG scripts
npm run data:generate           # generate test data
npm run rag:embed               # generate RAG embeddings
npm run qdrant:upsert           # upload KB docs to Qdrant vector DB
npm run openrouter:test         # test OpenRouter connectivity
```

## Architecture

### Frontend (`src/`)

Single-page React app with all state managed locally in `CockpitPage.tsx` via `useState` (no Redux/Context). Props flow down, callbacks flow up.

- **`src/features/cockpit/`** — core feature module
  - `CockpitPage.tsx` — root state orchestrator (active cluster, filters, dataset, dark mode, expanded metrics, drawer states, AI narratives)
  - `model/` — metric type definitions, cluster metadata (`sampleData.ts`), KPI computation (`runtimeMetrics.ts`), RAG scoring (`metricExplain.ts`)
  - `runtime-data/` — client-side data pipeline: XLSX/CSV parsing (`parse.ts`), filter logic (`filters.ts`), insight context (`insights.ts`), trend calculation (`trends.ts`), chart aggregation (`charts.ts`)
  - `chat/` — AI chat integration: `useCockpitChat.ts` hook (wraps Vercel AI SDK `useChat`), tool definitions (`tools.ts`), message rendering (`ChatParts.tsx`)
  - `components/` — UI: `MetricCard`, `MetricsGrid`, `ChatWidget`, `TopBar`, `SidebarNav`, `FiltersDrawer`, `KeyInsightsPanel`, `InsightDrawer`, etc.
  - `components/viz/` — visualization components: `Sparkline`, `GaugeArc`, `ProgressBar`, `BulletBar`, `RatioBlocks`, `StarDots`
- **`src/components/ui/`** — shadcn/ui vendor components (installed via `npx ai-elements`)
- **`src/components/ai-elements/`** — Streamdown markdown renderer vendor components
- **`src/lib/`** — utilities (`cn.ts` for classnames)

### API (`api/`) — Vercel Edge Functions

All endpoints run on Vercel Edge Runtime, use OpenRouter via `@openrouter/ai-sdk-provider`.

- `chat.ts` — `POST /api/chat`: streaming chat with tool calling (server tool: `retrieveDocs`; client tools: `openFilters`, `expandMetric`, `askForConfirmation`)
- `insights.ts` — `POST /api/insights`: generates cluster AI briefs (headline, bullets, actions, watchouts)
- `metric-narratives.ts` — `POST /api/metric-narratives`: generates alarm/insight/action text per metric, retrieves 3 KB docs per metric via RAG
- `health.ts` — `GET /api/health`: env/debug check
- `completion.ts` — `POST /api/completion`: optional streaming completion
- `errors.ts` — user-friendly error mapping (429 rate limit, 401 auth, policy blocks)
- `env.ts` — centralized environment variable access

### Knowledge Base & RAG (`api/knowledge-base/`, `api/rag/`)

41 static knowledge base documents in `kb-docs.json` (metric definitions, formulas, thresholds, global grounding rules, cluster guidance). RAG retrieval supports keyword search (always available) with optional Qdrant vector DB for semantic search.

### Data Flow

User uploads `.xlsx/.csv` → client-side parse → normalized `ApplicationFactRow[]` → apply filters → compute metrics with RAG scoring → AI generates narratives via `/api/metric-narratives` → render color-coded tiles. Chat queries go to `/api/chat` with `metricSnapshot` context (aggregates only, never raw rows).

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **TypeScript strict mode** with `noUnusedLocals` and `noUnusedParameters`
- **ESLint relaxed** for `src/components/` (vendor code from shadcn/ai-elements)
- **ES modules** throughout (`"type": "module"` in package.json)
- **Data privacy:** never send raw candidate-level rows to the LLM — only computed aggregates (`metricSnapshot`)
- **Tests:** Vitest with `globals: true` and `environment: 'node'`; test files use `*.test.ts` suffix co-located with source

## Environment Variables (`.env.local`)

```
OPENROUTER_API_KEY=sk-or-v1-...     # required
CHAT_MODEL=openai/gpt-4.1           # default if unset
EMBEDDING_MODEL=qwen/qwen3-embedding-8b
QDRANT_URL=...                      # optional, for vector search
QDRANT_API_KEY=...                   # optional
QDRANT_COLLECTION=ta_cockpit_kb     # optional
```
