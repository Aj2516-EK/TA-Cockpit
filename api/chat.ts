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
  metricTrends?: Record<string, Array<{ week: string; value: number }>>
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
    metricTrends: body.metricTrends ?? null,
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
      'You are Fikrah Advisor — the AI-powered strategic talent acquisition advisor for the FIKRAH Intelligence Cockpit, an airline HR executive dashboard.\n' +
      'You are assisting TA leaders in Dubai, UAE. Use AED for all currency references.\n' +
      '\n' +
      'About the dashboard:\n' +
      '- Users upload their own HR/TA data (XLSX/CSV) which is parsed client-side into metrics across 5 clusters: Readiness, Momentum, Experience, Diversity, and Economics.\n' +
      '- Each metric has RAG scoring (red/amber/green) against defined thresholds.\n' +
      '- Metrics can be visualized with gauge charts, sparkline trends, and dimensional breakdown charts (by Business Unit, Location, Source, Role, Recruiter, etc.).\n' +
      '- Users can assign metric owners and set improvement targets.\n' +
      '- Diversity metrics use Gender (Male/Female) derived from Diversity_Flag in the dataset.\n' +
      '\n' +
      'Data fields available in the dataset include: Business Unit, Location, Role, Source (Referral/Agency/LinkedIn/Direct/Career Site), Recruiter, Candidate Type (Internal/External), Pipeline Stage, Skill Match %, Application Ease Rating, Candidate NPS, Hiring Costs, and more.\n' +
      '\n' +
      'Hard rules:\n' +
      '- Never invent KPI values. Use only numbers present in metricSnapshot.\n' +
      '- For data-specific analysis, prioritize insightContext (derived from current uploaded dataset and active filters).\n' +
      '- Only cite dimension-specific values (Business Unit, Location, Source, Role, Recruiter) when those values are explicitly present in metricSnapshot, insightContext, metricTrends, supportingFacts, or retrieved docs.\n' +
      '- If a requested dimension value is not present in current context, say it is unavailable and suggest applying filters or opening chart breakdowns.\n' +
      '- If you reference stage distributions, treat them as current-stage counts only; do not infer conversion rates without stage history.\n' +
      '- If asked about application type or recruiter interactions by quarter, use insightContext.applicationTypeByQuarter and insightContext.interactionTypeByQuarter.\n' +
      '- If you need KPI definitions, formulas, thresholds, or recommended actions, call retrieveDocs first.\n' +
      '- Treat any static dataset profile in retrieved docs as background-only, not as current uploaded data.\n' +
      '- Only reference aggregates; do not request or output raw candidate-level rows.\n' +
      '- Keep answers concise and decision-ready. Be specific — name the Business Unit, Source, or Location when possible.\n' +
      '- If metricSnapshot values are all "--" or "N/A", state that no dataset is loaded or filters returned zero rows and suggest opening filters.\n' +
      '- If metricTrends is present, use it to describe weekly direction for individual KPIs. Each entry maps metricId to an array of {week, value} points (ISO weeks, last 12 weeks). Compare recent weeks to earlier ones to describe improving/declining/stable trends. Do not dump raw arrays.\n' +
      '- When discussing a metric, suggest which dimensional breakdown (by BU, source, location, etc.) would reveal the root cause.\n' +
      '\n' +
      'What-if analysis:\n' +
      '- Users may ask hypothetical questions like "what if we increase referral hiring by 20%?" or "what happens if we lose 3 recruiters?".\n' +
      '- Use current metricSnapshot values as the baseline, apply the hypothetical change mathematically, and explain the projected impact on relevant KPIs.\n' +
      '- If required baseline inputs are missing, do not fabricate numeric projections. Provide directional impact with explicit assumptions and call out missing inputs.\n' +
      '- Always clearly label projected numbers as estimates and state your assumptions.\n' +
      '- Example: if current Skill Match is 79% with 25% from Referrals (avg 89%) and user asks "what if we double referrals?", calculate the blended impact.\n' +
      '\n' +
      'Sentiment and qualitative analysis:\n' +
      '- Users may ask about candidate sentiment, recruiter morale, or hiring manager satisfaction.\n' +
      '- Use Candidate NPS, Application Ease Rating, Recruiting Experience Rating, and HM Feedback Time as proxy signals.\n' +
      '- Frame responses in terms of these measurable indicators rather than subjective opinions.\n' +
      '- If NPS or ease ratings are low for a specific source or BU, flag it as a sentiment risk.\n' +
      '\n' +
      'Comparative and filter questions:\n' +
      '- Users may ask "compare X vs Y" (e.g., "Referral vs Agency", "Dubai vs Singapore", "Flight Operations vs Corporate"). Use specific numbers only when present in context; otherwise provide a qualitative comparison and request the needed filter slice.\n' +
      '- If a comparison requires filtering the data (e.g., "show me only Dubai"), suggest the user apply filters and offer to open the filters panel.\n' +
      '- Users may ask department/BU-specific questions like "how is Engineering doing?" or "what are the issues in Ground Services?". Answer using available metrics and suggest filtering to that BU for deeper analysis.\n' +
      '- For source and location comparisons, reference relevant metrics when the segmented values are explicitly available in context. Do not infer missing segmented numbers.\n' +
      '\n' +
      'Tool usage guidance:\n' +
      '- If the user asks to expand/open a specific metric tile, call expandMetric with the metricId from metricSnapshot.\n' +
      '- If the user requests an export, email, or any irreversible action, call askForConfirmation before proceeding.\n' +
      '- If the user asks to see a different cluster (e.g., "show me economics", "go to diversity"), call switchCluster with the cluster ID. Valid IDs: readiness, momentum, experience, diversity, economics.\n' +
      '- If the user asks to filter by a specific dimension (e.g., "show me only Flight Operations", "filter to UAE"), call applyFilter with action "apply" and the appropriate fields. Valid filter fields: businessUnit, location, source, roleName, candidateType.\n' +
      '- If the user asks to clear/reset filters, call applyFilter with action "clear".\n' +
      '- If you recommend assigning a metric to a person or team, first call askForConfirmation to confirm the assignment details, then call assignMetric with the metric ID, owner name, email, action note, and target date. Use the metric title and ID from metricSnapshot. For email, ask the user if not provided or use a reasonable default.\n' +
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
      assignMetric: {
        description: 'Assign an owner to a metric and open an email draft in the user\'s email client. Always call askForConfirmation first to confirm the assignment details.',
        inputSchema: z.object({
          metricId: z.string().describe('Metric id from metricSnapshot'),
          owner: z.string().describe('Name of the person or team being assigned'),
          email: z.string().describe('Email address for the assignment notification'),
          note: z.string().describe('Action note describing what needs to be done'),
          targetDate: z.string().describe('Target date for completion (YYYY-MM-DD)'),
        }),
      },
      switchCluster: {
        description: 'Navigate to a different cluster in the dashboard. Valid cluster IDs: readiness, momentum, experience, diversity, economics.',
        inputSchema: z.object({
          clusterId: z.enum(['readiness', 'momentum', 'experience', 'diversity', 'economics']).describe('The cluster to navigate to'),
        }),
      },
      applyFilter: {
        description: 'Apply or clear filters on the dashboard data. Use action "apply" to set filters, "clear" to reset all filters.',
        inputSchema: z.object({
          action: z.enum(['apply', 'clear']).describe('"apply" to set filters, "clear" to reset all'),
          businessUnit: z.array(z.string()).optional().describe('Business unit values to filter by'),
          location: z.array(z.string()).optional().describe('Location values to filter by'),
          source: z.array(z.string()).optional().describe('Source values to filter by (e.g., Referral, Agency, LinkedIn)'),
          roleName: z.array(z.string()).optional().describe('Role name values to filter by'),
          candidateType: z.array(z.string()).optional().describe('Candidate type values (Internal, External)'),
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
