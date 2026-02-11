import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getChatModel, requiredEnv } from './env'
import { getPublicAiErrorMessage } from './errors'

export const config = {
  runtime: 'edge',
}

const MetricSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  valueText: z.string(),
  thresholdText: z.string(),
  rag: z.enum(['red', 'amber', 'green']),
  supportingFacts: z.array(z.string()).optional().default([]),
})

const RequestSchema = z.object({
  activeCluster: z.string().optional(),
  filters: z.unknown().optional(),
  metricSnapshot: z
    .object({
      activeCluster: z.string().optional(),
      metrics: z.array(MetricSnapshotSchema).optional().default([]),
    })
    .optional(),
  insightContext: z.unknown().optional(),
})

const ResponseSchema = z.object({
  headline: z.string().min(1).max(160),
  bullets: z.array(z.string().min(1).max(260)).min(2).max(4),
  action: z.string().min(1).max(220),
  watchouts: z.array(z.string().min(1).max(200)).max(3),
})

type MetricSnapshot = z.infer<typeof MetricSnapshotSchema>

function fallbackInsights(metrics: MetricSnapshot[]) {
  const red = metrics.filter((m) => m.rag === 'red')
  const amber = metrics.filter((m) => m.rag === 'amber')
  const focus = [...red, ...amber].slice(0, 2)

  const bullets =
    focus.length > 0
      ? focus.map((m) => `${m.title}: ${m.valueText} vs target ${m.thresholdText}.`)
      : ['No critical KPI movement detected in the current slice.', 'Use filters to narrow to a high-risk cohort.']

  return {
    headline: red.length > 0 ? 'Critical KPIs need immediate intervention' : 'Cluster is stable with targeted watch areas',
    bullets,
    action:
      focus.length > 0
        ? `Start with ${focus[0].title}; assign an owner and run a 7-day corrective plan with daily tracking.`
        : 'Prioritize one strategic KPI and set a weekly improvement target.',
    watchouts: ['Fallback insight generated because LLM response was unavailable.'],
  }
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
  if (!parsed.success) return new Response('Invalid insights request payload', { status: 400 })

  const { activeCluster, filters, metricSnapshot, insightContext } = parsed.data
  const metrics = metricSnapshot?.metrics ?? []

  try {
    const openrouter = createOpenRouter({ apiKey: requiredEnv('OPENROUTER_API_KEY') })
    const modelName = getChatModel()
    console.info(
      `[insights:${reqId}] start model=${modelName} cluster=${String(activeCluster ?? 'unknown')} metrics=${metrics.length}`,
    )

    const result = await generateObject({
      model: openrouter(modelName),
      temperature: 0.15,
      schema: ResponseSchema,
      prompt:
        'You are a senior TA analytics advisor.\n' +
        'Return concise, executive-ready insights grounded only in provided data.\n' +
        'Rules:\n' +
        '- Use only numbers found in metricSnapshot or insightContext.\n' +
        '- Prioritize red metrics first, then amber.\n' +
        '- Mention concrete business implications and keep language specific.\n' +
        '- If a value is missing, say it is unavailable.\n' +
        '- Do not mention system internals, API, server, or database.\n' +
        '\n' +
        'Context JSON:\n' +
        JSON.stringify({
          activeCluster,
          filters,
          metricSnapshot,
          insightContext,
        }),
    })

    return Response.json({
      ...result.object,
      generatedAt: new Date().toISOString(),
      source: 'llm',
      model: modelName,
    })
  } catch (err) {
    console.warn('[insights] falling back after LLM error', err)
    return Response.json(
      {
        ...fallbackInsights(metrics),
        generatedAt: new Date().toISOString(),
        source: 'fallback',
        error: getPublicAiErrorMessage(err),
      },
      { status: 200 },
    )
  }
}
