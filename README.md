# TA Intelligence Cockpit (Hackathon MVP)

Airline-style Talent Acquisition dashboard with RAG-scored metric tiles, filters, and an AI chat advisor grounded in the current KPI snapshot (aggregates only).

## What’s Implemented
- React + Vite + TypeScript + Tailwind v4 UI (clusters, tiles, expand/collapse, key insights, collapsible sidebar, filters drawer, floating chat widget)
- Vercel Edge endpoints:
  - `POST /api/chat` (streaming chat + tool calling)
  - `POST /api/completion` (optional streaming completion endpoint)
  - `GET /api/health` (env/debug)
- OpenRouter integration via Vercel AI SDK (`ai`) + `@openrouter/ai-sdk-provider`
- Tool calling end-to-end:
  - Server tool: `retrieveDocs` (keyword retrieval over the in-repo knowledge base docs)
  - Client tools: `openFilters`, `expandMetric`, `askForConfirmation` (rendered as tool parts in chat)
- Markdown rendering for assistant text (tables/lists) using `ai-elements` Streamdown renderer
- User-friendly error mapping (rate limits, policy blocks, auth)

## What’s Next (Pending)
- Upload XLSX/CSV -> parse client-side -> normalized dataset
- Filters derived from dataset -> apply filters -> recompute metrics
- Deterministic “metrics engine” for the real dataset (replace sample metrics; keep tiles visible with `N/A` if not computable)
- Knowledge base expansion + embedding-based retrieval (optional “vector DB later” story)
- Optional: persist chat history in `localStorage`

## Local Development
Important: use **Vercel dev** (not `vite`) so `/api/*` routes exist.

1. Install deps
```bash
npm install
```

2. Create `.env.local` (repo root)
```bash
OPENROUTER_API_KEY=...
CHAT_MODEL=openai/gpt-oss-120b:free
EMBEDDING_MODEL=qwen/qwen3-embedding-8b
```

3. Run
```bash
vercel dev
```

Open the printed URL (usually `http://localhost:3000`).

4. Sanity-check env visibility
Open `http://localhost:3000/api/health` and confirm:
- `hasOpenRouterKey: true`

### OpenRouter Notes
- Some `:free` models can be blocked by your OpenRouter privacy/data policy; update settings or switch `CHAT_MODEL`.
- Free models can also be rate-limited upstream. If you hit 429s during demo, switch to a paid model.

## Scripts
- `npm run build`: typecheck + production build
- `npm run lint`: eslint
- `npm run dev`: starts Vite only (UI works, but `/api/*` is not available)

## Project Structure
- `src/features/cockpit/*`: main dashboard UI + state
- `src/features/cockpit/components/*`: UI components (tiles, sidebar, top bar, chat widget)
- `src/features/cockpit/chat/*`: chat hook + tool-part rendering (typed UI message parts)
- `api/chat.ts`: Edge chat endpoint (OpenRouter + tools)
- `api/completion.ts`: Edge completion endpoint (optional)
- `api/knowledge-base/*`: small in-repo “docs” used by `retrieveDocs`
- `legacy/`: original prototype reference

## Deployment (Vercel)
Deploy from GitHub as a standard Vite app with Vercel Functions:
- Set env vars in Vercel Project Settings:
  - `OPENROUTER_API_KEY`
  - `CHAT_MODEL`
  - `EMBEDDING_MODEL`

## Security
- Never commit `.env.local`.
- Do not send raw candidate-level rows to the LLM. Only send computed aggregates (`metricSnapshot`).

