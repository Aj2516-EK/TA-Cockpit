import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import { KNOWLEDGE_BASE_DOCS, type KnowledgeBaseDoc } from './knowledge-base/index.js'
import { getChatModel, requiredEnv } from './env.js'
import { getPublicAiErrorMessage } from './errors.js'
import { retrieveDocs } from './rag/index.js'

export const config = {
  runtime: 'edge',
}

type ChatRequestBody = {
  messages: UIMessage[]
  activeCluster?: string
  metricSnapshot?: unknown
  insightContext?: unknown
  filters?: unknown
}

function extractLastUserPromptPreview(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue

    const parts = (m as { parts?: unknown[] }).parts
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (!p || typeof p !== 'object') continue
        const part = p as { type?: unknown; text?: unknown }
        if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
          return part.text.trim().slice(0, 120)
        }
      }
    }
  }
  return ''
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const reqId = Math.random().toString(36).slice(2, 10)

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!body?.messages || !Array.isArray(body.messages)) {
    return new Response('Missing messages[]', { status: 400 })
  }

  const openrouter = createOpenRouter({ apiKey: requiredEnv('OPENROUTER_API_KEY') })

  const modelName = getChatModel()
  const fallbackModels = Array.from(new Set([modelName, 'openai/gpt-4o-mini']))
  const context = {
    activeCluster: body.activeCluster ?? null,
    filters: body.filters ?? null,
    metricSnapshot: body.metricSnapshot ?? null,
    insightContext: body.insightContext ?? null,
  }
  const metricCount = Array.isArray((context.metricSnapshot as { metrics?: unknown[] } | null)?.metrics)
    ? ((context.metricSnapshot as { metrics?: unknown[] }).metrics?.length ?? 0)
    : 0
  const promptPreview = extractLastUserPromptPreview(body.messages)
  console.info(
    `[chat:${reqId}] start model=${modelName} fallbacks=${fallbackModels.join(',')} messages=${body.messages.length} cluster=${String(context.activeCluster)} metrics=${metricCount} prompt="${promptPreview}"`,
  )

  // Prevent indefinite "connecting" states when the upstream provider stalls.
  const abortCtrl = new AbortController()
  const timeoutMs = 45_000
  const timeout = setTimeout(() => abortCtrl.abort(), timeoutMs)

  const result = streamText({
    model: openrouter(modelName, {
      extraBody: {
        // Let OpenRouter route to next model if primary is queued/unavailable.
        models: fallbackModels,
      },
    }),
    temperature: 0.1,
    maxOutputTokens: 700,
    abortSignal: abortCtrl.signal,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- For data-specific analysis, prioritize insightContext (derived from current uploaded dataset and active filters).\n' +
      '- If you need KPI definitions, formulas, thresholds, or recommended actions, call retrieveDocs first.\n' +
      '- Treat any static dataset profile in retrieved docs as background-only, not as current uploaded data.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep answers concise and decision-ready.\n' +
      '- If metricSnapshot values are all "--" or "N/A", state that no dataset is loaded or filters returned zero rows and ask to open filters.\n' +
      '\n' +
      'Tool usage guidance:\n' +
      '- If the user asks to change or view filters, call openFilters.\n' +
      '- If the user asks to expand/open a specific metric tile, call expandMetric with the metricId from metricSnapshot.\n' +
      '- If the user requests an export, email, or any irreversible action, call askForConfirmation before proceeding.\n' +
      '\n' +
      'Context (do not treat as user message):\n' +
      JSON.stringify(context) +
      '\n',
    messages: await convertToModelMessages(body.messages),
    tools: {
      retrieveDocs: {
        description:
          'Retrieve KPI definitions, formulas, thresholds, interpretation, and recommended actions for TA cockpit metrics. Use this before answering if definitions/actions are needed.',
        inputSchema: z.object({
          query: z.string().describe('User question or keyword query for retrieval'),
          k: z.number().int().min(1).max(12).default(6).describe('How many documents to retrieve'),
        }),
        execute: async ({ query, k }) => {
          const retrieved = await retrieveDocs(KNOWLEDGE_BASE_DOCS, query, k)
          console.info(
            `[chat:${reqId}] retrieveDocs mode=${retrieved.mode} k=${k} docs=${retrieved.docs.length} query="${query.slice(0, 80)}"`,
          )
          return retrieved.docs.map((d: KnowledgeBaseDoc) => ({
            id: d.id,
            title: d.title,
            cluster: d.cluster,
            text: d.text,
          }))
        },
      },

      // Client-side tools (no execute): forwarded to the UI as tool parts.
      openFilters: {
        description: 'Open the filters panel in the UI.',
        inputSchema: z.object({}),
      },
      expandMetric: {
        description: 'Expand a metric tile in the UI by metricId (must come from metricSnapshot).',
        inputSchema: z.object({
          metricId: z.string().describe('Metric id from metricSnapshot'),
        }),
      },
      askForConfirmation: {
        description: 'Ask the user to confirm before taking an irreversible or sensitive action.',
        inputSchema: z.object({
          message: z.string().describe('The confirmation message to show the user.'),
        }),
      },
    },
    onFinish: ({ finishReason }) => {
      clearTimeout(timeout)
      console.info(`[chat:${reqId}] finished model=${modelName} reason=${finishReason}`)
    },
  })

  return result.toUIMessageStreamResponse({
    onError: (err) => {
      clearTimeout(timeout)
      console.error(`[chat:${reqId}] stream error model=${modelName}`, err)
      return getPublicAiErrorMessage(err)
    },
  })
}
