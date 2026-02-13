# AGENTS.md

## Project overview
- TA Intelligence Cockpit is an airline-style Talent Acquisition dashboard with RAG-scored KPI tiles, filters, and an AI advisor.
- Frontend stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4.
- Backend runtime: Vercel Edge Functions in `api/`.
- AI provider path: OpenRouter via `@openrouter/ai-sdk-provider`.

## Dev environment tips
- Use `vercel dev` for full-stack local development.
- Use `npm run dev` only when working on UI in isolation.
- `npm run dev` does not expose `/api/*` routes.
- Use `npm run build` to run typecheck + production bundle.
- Use `npm run lint` before committing.
- Check scripts in `package.json` first instead of guessing commands.

## Core commands
- `vercel dev`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run test:watch`
- `npx vitest run src/features/cockpit/runtime-data/filters.test.ts`
- `npm run data:generate`
- `npm run data:curate:hackathon`
- `npm run rag:embed`
- `npm run rag:embed:dry`
- `npm run qdrant:upsert`
- `npm run openrouter:test`

## Architecture

### Frontend (`src/`)
- Single-page React app with primary state orchestration in `src/features/cockpit/CockpitPage.tsx`.
- `src/features/cockpit/model/` contains metric types, sample metadata, KPI computation, and RAG scoring rules.
- `src/features/cockpit/runtime-data/` contains parse/filter/trend/chart/insight context pipeline.
- `src/features/cockpit/chat/` contains AI chat hook and tool message rendering.
- `src/features/cockpit/components/` contains dashboard UI components.
- `src/features/cockpit/components/viz/` contains metric visualization primitives.
- `src/components/ui/` and `src/components/ai-elements/` contain vendor-style UI pieces.
- `src/lib/` contains shared utilities like class name helpers.

### API (`api/`)
- `api/chat.ts` for streaming chat + tool calling.
- `api/insights.ts` for cluster brief generation.
- `api/metric-narratives.ts` for per-metric narrative generation.
- `api/health.ts` for env/debug checks.
- `api/completion.ts` as optional completion endpoint.
- `api/env.ts` for environment accessors.
- `api/errors.ts` for user-facing AI error mapping.

### Knowledge base and RAG
- `api/knowledge-base/kb-docs.json` stores static TA knowledge docs.
- `api/knowledge-base/documents.ts` validates and exports KB docs.
- `api/rag/keyword.ts` handles keyword retrieval fallback.
- `api/rag/qdrant.ts` handles optional vector retrieval.
- `api/rag/retrieve.ts` orchestrates retrieval mode selection.

## Data flow
- User uploads `.xlsx` or `.csv`.
- Client parses and normalizes records.
- Filters are applied client-side.
- Metrics are computed and RAG-scored.
- AI narratives are generated via `/api/metric-narratives`.
- Chat requests use aggregate context (`metricSnapshot`) through `/api/chat`.
- Raw candidate-level rows should not be sent to the LLM.

## TypeScript and module rules
- Project uses ES modules (`"type": "module"`).
- In `api/**`, use explicit `.js` extensions for relative imports (NodeNext on Vercel).
- Keep barrel exports in `api/**/index.ts` with `.js` suffixed paths.
- `api/knowledge-base/documents.ts` intentionally keeps plain JSON import with TypeScript suppression because current Vercel bundling in this project fails on import attributes.

## Testing instructions
- Find CI checks in `.github/workflows`.
- Run `npm test` for the full Vitest run.
- Use `npm run test:watch` while iterating locally.
- To run one test file, use `npx vitest run <path-to-test-file>`.
- Fix test, lint, and type errors until all checks pass.
- After import/path changes, rerun `npm run lint` and `npm run build`.
- Add or update tests for changed behavior when applicable.

## PR instructions
- Title format: `[ta-cockpit] <Title>`
- Always run `npm run lint` and `npm test` before committing.
- Run `npm run build` before merging changes that affect types/imports/build config.
- Keep PRs focused and include only related changes.

## Scope guardrails
- If the task is UI-only, make UI-only changes.
- Do not modify backend files (`api/**`) for UI-only requests.

## Environment variables (`.env.local`)
- `OPENROUTER_API_KEY` required for AI endpoints.
- `CHAT_MODEL` optional override (default used if unset).
- `EMBEDDING_MODEL` optional embedding model override.
- `QDRANT_URL` optional vector DB URL.
- `QDRANT_API_KEY` optional Qdrant API key.
- `QDRANT_COLLECTION` optional collection name.
