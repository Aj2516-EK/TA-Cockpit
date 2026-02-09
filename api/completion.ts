import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { z } from 'zod'
import { KNOWLEDGE_BASE_DOCS } from './knowledge-base'
import { getChatModel, requiredEnv } from './env'
import { getPublicAiErrorMessage } from './errors'

export const config = {
  runtime: 'edge',
}

type CompletionRequestBody = {
  prompt: string
  activeCluster?: string
  metricSnapshot?: unknown
  filters?: unknown
}

function simpleRetrieveDocs(query: string, k: number) {
  const q = query.toLowerCase()
  const scored = KNOWLEDGE_BASE_DOCS.map((d) => {
    const hay = (d.title + ' ' + d.id + ' ' + d.text + ' ' + (d.tags ?? []).join(' ')).toLowerCase()
    let score = 0
    for (const term of q.split(/\s+/).filter(Boolean)) if (hay.includes(term)) score += 1
    if (q.includes(d.cluster)) score += 2
    return { d, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(12, k)))
    .map((x) => x.d)
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
  }

  const result = streamText({
    model: openrouter(modelName),
    temperature: 0.1,
    maxOutputTokens: 500,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- If you need KPI definitions/formulas/thresholds/actions, call retrieveDocs first.\n' +
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
          return simpleRetrieveDocs(query, k).map((d) => ({
            id: d.id,
            title: d.title,
            cluster: d.cluster,
            text: d.text,
          }))
        },
      },
    },
    prompt,
  })

  // useCompletion (default streamProtocol="data") expects UI message chunks, so we return UI stream.
  return result.toUIMessageStreamResponse({
    onError: getPublicAiErrorMessage,
  })
}
