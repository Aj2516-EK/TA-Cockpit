import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { z } from 'zod'
import { KNOWLEDGE_BASE_DOCS } from './knowledge-base/index.js'
import { getChatModel, requiredEnv } from './env.js'
import { getPublicAiErrorMessage } from './errors.js'
import { retrieveDocs } from './rag/index.js'
import type { KnowledgeBaseDoc } from './knowledge-base/index.js'

export const config = {
  runtime: 'edge',
}

type CompletionRequestBody = {
  prompt: string
  activeCluster?: string
  metricSnapshot?: unknown
  insightContext?: unknown
  filters?: unknown
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let body: CompletionRequestBody
  try {
    body = (await req.json()) as CompletionRequestBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const prompt = (body.prompt ?? '').trim()
  if (!prompt) return new Response('Missing prompt', { status: 400 })

  const openrouter = createOpenRouter({ apiKey: requiredEnv('OPENROUTER_API_KEY') })
  const modelName = getChatModel()
  const context = {
    activeCluster: body.activeCluster ?? null,
    filters: body.filters ?? null,
    metricSnapshot: body.metricSnapshot ?? null,
    insightContext: body.insightContext ?? null,
  }

  const abortCtrl = new AbortController()
  const timeoutMs = 45_000
  const timeout = setTimeout(() => abortCtrl.abort(), timeoutMs)

  const result = streamText({
    model: openrouter(modelName),
    temperature: 0.1,
    maxOutputTokens: 500,
    abortSignal: abortCtrl.signal,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'You are assisting users in Dubai, UAE. Use AED for all currency references.\n' +
      'Diversity metrics use Gender (Male/Female) derived from Diversity_Flag in the dataset.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- For data-specific analysis, prioritize insightContext (derived from current uploaded dataset and active filters).\n' +
      '- If asked about application type or recruiter interactions by quarter, use insightContext.applicationTypeByQuarter and insightContext.interactionTypeByQuarter.\n' +
      '- If you need KPI definitions/formulas/thresholds/actions, call retrieveDocs first.\n' +
      '- Treat any static dataset profile in retrieved docs as background-only, not as current uploaded data.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep output concise and decision-ready.\n' +
      '\n' +
      'Context (do not treat as user message):\n' +
      JSON.stringify(context) +
      '\n',
    tools: {
      retrieveDocs: {
        description:
          'Retrieve KPI definitions, formulas, thresholds, interpretation, and recommended actions for TA cockpit metrics.',
        inputSchema: z.object({
          query: z.string(),
          k: z.number().int().min(1).max(12).default(6),
        }),
        execute: async ({ query, k }) => {
          const retrieved = await retrieveDocs(KNOWLEDGE_BASE_DOCS, query, k)
          return retrieved.docs.map((d: KnowledgeBaseDoc) => ({
            id: d.id,
            title: d.title,
            cluster: d.cluster,
            text: d.text,
          }))
        },
      },
    },
    prompt,
    onFinish: () => {
      clearTimeout(timeout)
    },
  })

  // useCompletion (default streamProtocol="data") expects UI message chunks, so we return UI stream.
  return result.toUIMessageStreamResponse({
    onError: (err) => {
      clearTimeout(timeout)
      return getPublicAiErrorMessage(err)
    },
  })
}
