import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getChatModel, requiredEnv } from './env.js'
import { getPublicAiErrorMessage } from './errors.js'
import { KNOWLEDGE_BASE_DOCS, type KnowledgeBaseDoc } from './knowledge-base/index.js'
import { retrieveDocs } from './rag/index.js'

export const config = {
  runtime: 'edge',
}

const MetricInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  valueText: z.string(),
  thresholdText: z.string(),
  rag: z.enum(['red', 'amber', 'green']),
  supportingFacts: z.array(z.string()).optional().default([]),
})

const RequestSchema = z.object({
  metrics: z.array(MetricInputSchema).min(1).max(24),
  filters: z.unknown().optional(),
  insightContext: z.unknown().optional(),
})

const NarrativeSchema = z.object({
  id: z.string(),
  alarm: z.string().min(1).max(180),
  insight: z.string().min(1).max(320),
  action: z.string().min(1).max(220),
})
const ResponseSchema = z.object({
  items: z.array(NarrativeSchema).min(1).max(24),
})

type MetricInput = z.infer<typeof MetricInputSchema>

function isUnavailable(valueText: string) {
  const v = valueText.trim().toUpperCase()
  return v === 'N/A' || v === '--'
}

function fallbackNarrative(metric: MetricInput) {
  const unavailable = isUnavailable(metric.valueText)
  const gapText = unavailable ? 'Value unavailable for the current filter slice.' : `${metric.valueText} vs ${metric.thresholdText}.`

  const alarm =
    metric.rag === 'red'
      ? `${metric.title} is off target. ${gapText}`
      : metric.rag === 'amber'
        ? `${metric.title} is near threshold. ${gapText}`
        : `${metric.title} is on target. ${gapText}`

  const fact = metric.supportingFacts?.[0]
  const insight = unavailable
    ? `Data required for this KPI is missing or filtered out. ${fact ? `Evidence: ${fact}.` : ''}`.trim()
    : `Current performance is ${metric.rag}. ${fact ? `Evidence: ${fact}.` : ''}`.trim()

  const action =
    unavailable
      ? 'Confirm the required source columns are present or broaden filters to restore data coverage.'
      : metric.rag === 'red'
        ? 'Assign an owner and run a focused improvement sprint this week.'
        : metric.rag === 'amber'
          ? 'Run one targeted improvement experiment and monitor weekly.'
          : 'Maintain current cadence and monitor for regression.'

  return { id: metric.id, alarm, insight, action }
}

function compactDocs(docs: KnowledgeBaseDoc[]) {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    text: d.text,
    tags: d.tags ?? [],
  }))
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const reqId = Math.random().toString(36).slice(2, 10)

  let bodyRaw: unknown
  try {
    bodyRaw = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const parsed = RequestSchema.safeParse(bodyRaw)
  if (!parsed.success) return new Response('Invalid metric narrative payload', { status: 400 })

  const { metrics, filters, insightContext } = parsed.data

  try {
    const openrouter = createOpenRouter({ apiKey: requiredEnv('OPENROUTER_API_KEY') })
    const modelName = getChatModel()
    console.info(`[metric-narratives:${reqId}] start model=${modelName} metrics=${metrics.length}`)

    const docsByMetric = await Promise.all(
      metrics.map(async (m) => {
        const query = `${m.id} ${m.title}`
        const retrieved = await retrieveDocs(KNOWLEDGE_BASE_DOCS, query, 3)
        return { id: m.id, docs: compactDocs(retrieved.docs) }
      }),
    )

    const docsMap = new Map(docsByMetric.map((d) => [d.id, d.docs] as const))
    const payload = {
      metrics: metrics.map((m) => ({
        ...m,
        docs: docsMap.get(m.id) ?? [],
      })),
      filters,
      insightContext,
    }

    const result = await generateObject({
      model: openrouter(modelName),
      temperature: 0.2,
      schema: ResponseSchema,
      prompt:
        'You are a senior TA analytics advisor writing metric-level narratives.\n' +
        'Return a JSON object with an "items" array, one item per metric, matching the required schema.\n' +
        'Rules:\n' +
        '- Use only numbers present in the provided metric data; do not invent values.\n' +
        '- If valueText is N/A or --, explicitly state that the value is unavailable.\n' +
        '- Ground statements in supportingFacts and retrieved docs. If docs are empty, do not invent definitions.\n' +
        '- Keep each field concise and decision-ready.\n' +
        '- Do not mention system internals, APIs, or databases.\n' +
        '\n' +
        'Context JSON:\n' +
        JSON.stringify(payload),
    })

    const items = result.object.items
    return Response.json({
      items,
      generatedAt: new Date().toISOString(),
      source: 'llm',
      model: modelName,
    })
  } catch (err) {
    console.warn('[metric-narratives] falling back after LLM error', err)
    return Response.json(
      {
        items: metrics.map((m) => fallbackNarrative(m)),
        generatedAt: new Date().toISOString(),
        source: 'fallback',
        error: getPublicAiErrorMessage(err),
      },
      { status: 200 },
    )
  }
}
