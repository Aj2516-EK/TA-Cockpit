# TA Cockpit MVP Plan (Vercel-Hosted, Upload-Driven, Embeddings-in-Repo)

## Task List (MVP)
- [x] Vite + React + TypeScript scaffold in repo root
- [x] Tailwind v4 configured (`@tailwindcss/vite`) + shared design tokens in `src/index.css`
- [x] Preserve legacy prototype for reference in `legacy/`
- [x] Clean UI skeleton in React (clusters, tiles, expand/collapse, sidebar collapse, top bar, filters drawer)
- [x] “Ask AI” implemented as floating chat widget (client) with streaming
- [x] Vercel Edge API endpoints:
  - [x] `POST /api/chat` (streaming + tool calling)
  - [x] `POST /api/completion` (optional)
  - [x] `GET /api/health` (debug env visibility)
- [x] OpenRouter integration via Vercel AI SDK + env-driven model selection
- [x] Tool calling wired end-to-end:
  - [x] Server tool: `retrieveDocs` (keyword search over KB docs)
  - [x] Client tools: `openFilters`, `expandMetric`, `askForConfirmation` (UI tool parts)
- [x] Markdown rendering in chat (tables/lists) via `ai-elements` Streamdown renderer
- [x] User-friendly AI error messaging (rate limit, policy block, auth)
- [x] Shared UI component library installed via `npx ai-elements`:
  - [x] `src/components/ai-elements/*`
  - [x] `src/components/ui/*`
  - [x] `components.json` generator config
- [x] Upload XLSX/CSV in main panel (client-side)
- [x] Parse uploaded dataset -> normalized fact rows (in-memory)
- [x] Populate filter dropdown options from uploaded dataset
- [x] Apply filters -> recompute metrics live
- [x] Deterministic “metrics engine” (computed KPIs with supporting facts; proxies documented)
- [x] Key Insights are functional + clickable:
  - [x] Derived from current computed metrics (red/amber first)
  - [x] Click insight -> switch cluster, expand metric, scroll into view, open explanation drawer
- [ ] Replace remaining proxy KPIs with “true” formulas once the dataset schema is finalized (optional)
- [ ] Knowledge Base expansion (docs per metric/cluster; actions/playbooks)
- [ ] Embedding-based retrieval (Option 1):
  - [ ] offline embedding generation script
  - [ ] `rag/embeddings.f32` + `rag/embeddings.meta.json`
  - [ ] cosine similarity retrieval in `retrieveDocs`
- [ ] Persist chat history in browser (localStorage) (optional)
- [ ] Vercel deploy from GitHub (env vars set in Vercel Project Settings)

## Goal
Ship a hackathon MVP that is:
- Fully functional (real computed metrics, real filtering, AI grounded in computed results)
- Deployable entirely on Vercel from GitHub (CI/CD)
- Demo-friendly: dataset uploaded at runtime (no persistent storage required)
- “RAG-ready”: uses precomputed embeddings stored in-repo to simulate a vector DB now, and can be swapped to a real vector DB later

## Proposed Tech Stack (Vercel-All-In-One)
- Frontend: Vite + React + TypeScript
- Styling: TailwindCSS (reuse existing look/feel from `index.html`)
- Data parsing (client): `xlsx` (parse uploaded `.xlsx` in the browser)
- KPI computation: TypeScript “metrics engine” in the browser (deterministic)
- AI: Vercel Serverless Function (Node/TS) calling OpenRouter
  - Use Vercel AI SDK (`ai`) + OpenRouter provider (`@openrouter/ai-sdk-provider`)
- RAG-lite retrieval: precomputed embeddings JSON committed to repo (no external DB)
- Persistence (MVP): none required; optional localStorage for “assigned actions”

## Chosen Models (OpenRouter)
- Embeddings: `qwen/qwen3-embedding-8b`
- Chat: `openai/gpt-oss-120b:free` (tool calling supported)

## Key Product Constraints (From Requirements)
- All metric tiles visible, ordered Red then Amber then Green within a cluster
- Tiles expand/collapse inline and show: value vs threshold, alarm narrative, AI insight, recommended action
- Left panel shows Key Insights derived from the Red tiles
- Ask AI answers using current filters + computed KPIs (AI must not invent KPI values)

## High-Level Architecture

### Data Flow (Runtime)
1. User uploads dataset (`.xlsx` or `.csv`) in the browser.
2. Browser parses into normalized in-memory tables (one per sheet).
3. Filters apply in the browser; metrics engine computes KPI values + supporting facts.
4. UI renders clusters/tiles using the computed values and RAG ordering.
5. Ask AI:
   - Browser sends to `/api/chat`: `messages`, `filters`, `metricSnapshot` (computed KPIs + supporting facts), plus a “retrieval hint” list (cluster + metric ids).
   - Server retrieves relevant docs via `retrieveDocs`:
     - Current MVP: keyword search over in-repo knowledge base docs
     - Later: cosine similarity over in-repo embeddings (Option 1)
   - Server streams the response back to the UI (assistant text + tool parts).

### Why Compute KPIs Client-Side (MVP)
- Avoid serverless upload limits and complexity
- Fast iteration and “it works on demo laptop”
- Still keeps the OpenRouter API key secure server-side

## RAG Option 1 (Embeddings Stored in Repo)

### What Gets Embedded
A small corpus of “docs” (JSON objects), e.g. `rag/docs.json`:
- One doc per metric (definition, formula, threshold logic, interpretation, sample actions)
- One doc per cluster (purpose, what good looks like)
- Alarm narrative templates doc (trend/outlier/benchmark phrasing with strict grounding rules)
- Glossary/data dictionary doc (business terms -> dataset columns, filter mappings)

Example doc fields:
- `id`: `metric.readiness.qualified_candidates_availability`
- `title`
- `cluster`
- `text`: canonical description (definition + formula + interpretation)
- `tags`: e.g. `["readiness","supply","kpi"]`

### Embedding Storage Format
Do not store large vectors as raw JSON arrays (repo bloat + slow cold starts).

Store:
- `rag/embeddings.f32`: contiguous float32 matrix (N x D)
- `rag/embeddings.meta.json`: metadata + id index

Example `rag/embeddings.meta.json`:
```json
{
  "model": "qwen/qwen3-embedding-8b",
  "dims": 4096,
  "count": 42,
  "ids": [
    "metric.readiness.qualified_candidates_availability"
  ]
}
```

### Retrieval at Runtime (Serverless)
- Tool-driven retrieval (model decides when to call retrieval):
  - Provide 1 tool: `retrieveDocs({ query: string, k: number })`
  - Tool implementation embeds `query` using `qwen/qwen3-embedding-8b`, runs cosine similarity vs `rag/embeddings.f32`, returns top-k docs from `rag/docs.json`
  - Enforce `maxToolCalls: 1` for predictable demo latency
- Guardrail retry:
  - If the model answers without calling `retrieveDocs` and references definitions/actions not present in the provided context, retry once with a stronger instruction (“call retrieveDocs first”)

### Embedding Generation (One-Time / CI)
Provide a script (run locally or in GitHub Actions) that:
- reads `rag/docs.json`
- calls OpenRouter embeddings (`qwen/qwen3-embedding-8b`)
- writes `rag/embeddings.f32` + `rag/embeddings.meta.json`

Note: This is purely to demonstrate “vector DB later”; swapping to Upstash Vector/Pinecone becomes: “write embeddings there instead of JSON”.

## Metrics Engine Plan (Deterministic KPIs)

### Normalize the XLSX Into Tables
Expect the uploaded `Data for Cockpit.xlsx` format:
- `1_Requisition`
- `2_Candidate`
- `3_Application_Pipeline`
- `4_Recruiter_Activity`
- `5_Interview_Offer`
- `6_Hiring_Cost`
- `7_Job_Posting_Analytics`

Parse into a TS structure:
- `tables.requisition[]`
- `tables.candidate[]`
- `tables.application[]`
- etc.

### Filters (MVP Subset)
Implement only what we can reliably derive from the dataset we have:
- Date range: application date from/to (from Application_Pipeline)
- Business unit/department (Requisition.Business_Unit)
- Role (Requisition.Role_Name)
- Location (Requisition.Location)
- Gender / Nationality / Diversity flags (Candidate, where available)
- Internal/external (if present; otherwise approximate via candidate fields)

### KPI Definitions
For each KPI tile:
- Implement `compute(inputs) -> { value, unit, numerator, denominator, trend?, rag, threshold, supportingFacts }`
- supportingFacts example: “vs last quarter”, “top role contributing”, “sample sizes”

Important: KPI values must come from real columns; if a KPI is not computable from available columns, explicitly label it as “Not Available” (or compute a proxy and note the proxy).

## AI Integration Plan (OpenRouter)

### API Endpoint
`POST /api/chat` (streaming, tool calling)
Body:
- `messages: UIMessage[]` (Vercel AI SDK UI message format)
- `filters?: object`
- `metricSnapshot?: object` (computed KPIs with supporting facts)
- `activeCluster?: string`

Response:
- Streamed UI message chunks (assistant text + tool parts)

### Prompting Rules
- Hard rule: AI must not invent KPI values; it can only use provided numbers.
- Always include: metric snapshot (aggregates only) + (if tool called) retrieved docs.
- Keep token size bounded:
  - send aggregates, not raw rows
  - cap snapshot to active cluster + top few red metrics unless asked otherwise
- Determinism:
  - Use low temperature so the same question + same snapshot yields consistent answers

## Milestones (Suggested Execution Order)

### M0: Repo Prep (No UI Change Yet)
- Add Vite React TS scaffold
- Keep existing `index.html` as reference; new app lives under `/src`

### M1: UI Port
- Port the current layout to React components
- Keep clusters + tiles + expand/collapse behaviors
- Preserve ordering rules (R->A->G)

### M2: Upload + Parsing
- Add “Upload XLSX/CSV” control
- Parse into normalized tables
- Render filter dropdown options from parsed data

### M3: Real KPI Computation
- Implement metric catalog (one module per cluster)
- Compute values from tables + active filters
- Replace seeded values entirely

### M4: Thresholds + RAG Coloring + Progress Bars
- Define thresholds in a config file
- Compute `rag` for each metric
- Render progress bar vs threshold and show threshold logic inline

### M5: Ask AI + RAG-lite
- Ensure `/api/chat` is deployed with env vars set
- Add `rag/docs.json` + `rag/embeddings.f32` + `rag/embeddings.meta.json`
- Implement `retrieveDocs` tool + LLM call (Vercel AI SDK + OpenRouter provider)
- Wire Ask AI UI to call `/api/chat`

### M6: Key Insights Panel
- Derive “top insights” from Red metrics + AI narratives
- Display a few concise bullets with metric references

### M7: Vercel Deployment
- Add `vercel.json` if needed
- Add GitHub Actions (optional; Vercel auto-deploy is usually sufficient)
- Configure env vars on Vercel: `OPENROUTER_API_KEY`, `PRIMARY_MODEL`

## Acceptance Criteria (Demo-Ready)
- Uploading the provided XLSX populates filters and renders non-random KPI values
- Changing a filter recomputes metrics and updates RAG ordering
- Clicking a tile expands with value vs threshold, alarm narrative, insight, action
- Ask AI responds with grounded numbers consistent with current filters
- No OpenRouter key present in client bundle

## Risks and Mitigations
- XLSX schema drift:
  - Mitigation: robust header matching + fail-soft “metric unavailable”
- Serverless payload size:
  - Mitigation: send aggregates only (metric snapshot), not raw data
- Embedding generation dependency:
  - Mitigation: embeddings file can be committed once; regeneration is optional for hackathon
- Tool-calling reliability:
  - Mitigation: `maxToolCalls: 1` + retry once if tool usage was required but skipped

## Post-MVP Upgrades
- Replace JSON embeddings with Upstash Vector/Pinecone (same ids, same docs)
- Persist “actions” using Vercel KV/Blob + user auth
- Add historical trends across multiple uploads/datasets
