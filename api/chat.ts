import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import { KNOWLEDGE_BASE_DOCS, type KnowledgeBaseDoc } from './knowledge-base'
import { getChatModel, requiredEnv } from './env'
import { getPublicAiErrorMessage } from './errors'
import { retrieveDocs } from './rag'

export const config = {
  runtime: 'nodejs',
}

type ChatRequestBody = {
  messages: UIMessage[]
  activeCluster?: string
  metricSnapshot?: unknown
  filters?: unknown
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

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
  const context = {
    activeCluster: body.activeCluster ?? null,
    filters: body.filters ?? null,
    metricSnapshot: body.metricSnapshot ?? null,
  }

  const result = streamText({
    model: openrouter(modelName),
    temperature: 0.1,
    maxOutputTokens: 700,
    system:
      'You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- If you need KPI definitions, formulas, thresholds, or recommended actions, call retrieveDocs first.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep answers concise and decision-ready.\n' +
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
  })

  return result.toUIMessageStreamResponse({
    onError: getPublicAiErrorMessage,
  })
}
