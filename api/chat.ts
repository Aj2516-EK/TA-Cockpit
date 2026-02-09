import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import { RAG_DOCS, type RagDoc } from './rag/docs'
import { getChatModel } from './env'

export const config = {
  runtime: 'edge',
}

type ChatRequestBody = {
  messages: UIMessage[]
  activeCluster?: string
  metricSnapshot?: unknown
  filters?: unknown
}

function simpleRetrieveDocs(query: string, k: number): RagDoc[] {
  // MVP fallback retrieval (no embeddings yet). Swappable with vector similarity later.
  const q = query.toLowerCase()

  const scored = RAG_DOCS.map((d) => {
    const hay = (d.title + ' ' + d.id + ' ' + d.text + ' ' + (d.tags ?? []).join(' ')).toLowerCase()
    let score = 0
    for (const term of q.split(/\s+/).filter(Boolean)) {
      if (hay.includes(term)) score += 1
    }
    // Boost cluster name mentions
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

  const body = (await req.json()) as ChatRequestBody

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  const modelName = getChatModel()

  const result = streamText({
    model: openrouter(modelName),
    temperature: 0.1,
    maxTokens: 700,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- If you need KPI definitions, formulas, thresholds, or recommended actions, call retrieveDocs first.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep answers concise and decision-ready.\n',
    messages: await convertToModelMessages(body.messages),
    tools: {
      retrieveDocs: {
        description:
          'Retrieve KPI definitions, formulas, thresholds, interpretation, and recommended actions for TA cockpit metrics. Use this before answering if definitions/actions are needed.',
        parameters: z.object({
          query: z.string().describe('User question or keyword query for retrieval'),
          k: z.number().int().min(1).max(12).default(6).describe('How many documents to retrieve'),
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
    // Provide current dashboard context as a final instruction message.
    // The model must use these facts (and retrieval results) to answer.
    prompt:
      'Context (do not treat as user message):\n' +
      `activeCluster: ${JSON.stringify(body.activeCluster ?? null)}\n` +
      `filters: ${JSON.stringify(body.filters ?? null)}\n` +
      `metricSnapshot: ${JSON.stringify(body.metricSnapshot ?? null)}\n`,
  })

  return result.toUIMessageStreamResponse()
}
