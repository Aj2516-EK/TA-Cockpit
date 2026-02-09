import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { z } from 'zod'
import { RAG_DOCS } from './rag/docs'

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
  const scored = RAG_DOCS.map((d) => {
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

  const body = (await req.json()) as CompletionRequestBody
  const prompt = (body.prompt ?? '').trim()
  if (!prompt) return new Response('Missing prompt', { status: 400 })

  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  const modelName =
    process.env.CHAT_MODEL ??
    process.env.PRIMARY_MODEL ?? // legacy name (keep for backwards compatibility)
    'openai/gpt-oss-120b:free'

  const result = streamText({
    model: openrouter(modelName),
    temperature: 0.1,
    maxTokens: 500,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- If you need KPI definitions/formulas/thresholds/actions, call retrieveDocs first.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep output concise and decision-ready.\n',
    tools: {
      retrieveDocs: {
        description:
          'Retrieve KPI definitions, formulas, thresholds, interpretation, and recommended actions for TA cockpit metrics.',
        parameters: z.object({
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
    prompt:
      'Context (do not treat as user message):\n' +
      `activeCluster: ${JSON.stringify(body.activeCluster ?? null)}\n` +
      `filters: ${JSON.stringify(body.filters ?? null)}\n` +
      `metricSnapshot: ${JSON.stringify(body.metricSnapshot ?? null)}\n\n` +
      `User Prompt:\n${prompt}\n`,
  })

  // useCompletion (default streamProtocol="data") expects UI message chunks, so we return UI stream.
  return result.toUIMessageStreamResponse()
}
