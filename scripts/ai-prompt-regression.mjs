import process from 'node:process'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    baseUrl: process.env.AI_TEST_BASE_URL || 'http://localhost:3000',
    timeoutMs: Number(process.env.AI_TEST_TIMEOUT_MS || 60000),
    retries: Math.max(0, Number(process.env.AI_TEST_RETRIES || 1)),
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--base-url' && args[i + 1]) opts.baseUrl = args[++i]
    else if (a === '--timeout-ms' && args[i + 1]) opts.timeoutMs = Math.max(1000, Number(args[++i]) || opts.timeoutMs)
    else if (a === '--retries' && args[i + 1]) opts.retries = Math.max(0, Number(args[++i]) || opts.retries)
    else if (a === '--verbose') opts.verbose = true
  }

  return opts
}

async function readUiMessageEventStream(response) {
  if (!response.body) {
    return { events: [], text: '', toolCalls: [] }
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  const events = []

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value

    while (true) {
      const boundaryIndex = buffer.indexOf('\n\n')
      if (boundaryIndex < 0) break

      const rawEvent = buffer.slice(0, boundaryIndex)
      buffer = buffer.slice(boundaryIndex + 2)

      const lines = rawEvent.split(/\r?\n/)
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          events.push(JSON.parse(payload))
        } catch {
          // Ignore non-JSON chunks.
        }
      }
    }
  }

  const text = events
    .filter((event) => event?.type === 'text-delta' && typeof event.delta === 'string')
    .map((event) => event.delta)
    .join('')

  const toolCalls = events.filter((event) => event?.type === 'tool-input-available')

  return { events, text, toolCalls }
}

function lower(s) {
  return (s ?? '').toLowerCase()
}

function hasAny(text, needles) {
  const t = lower(text)
  return needles.some((needle) => t.includes(needle))
}

function createContextPayload(prompt) {
  return {
    messages: [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: prompt }],
      },
    ],
    activeCluster: 'economics',
    filters: {},
    metricSnapshot: {
      activeCluster: 'economics',
      metrics: [
        {
          id: 'metric.economics.cost_per_acquisition',
          title: 'Cost per Acquisition',
          valueText: 'AED 14,278',
          thresholdText: '< AED 14,700',
          rag: 'amber',
          supportingFacts: ['Hires: 20,449', 'Requisitions with cost: 8,000'],
        },
        {
          id: 'metric.economics.hm_feedback_time',
          title: 'HM Feedback Time',
          valueText: '3.0 days',
          thresholdText: '< 2.0 days',
          rag: 'red',
          supportingFacts: ['Candidates with interview+feedback dates: 50,885'],
        },
      ],
    },
    insightContext: {
      summary: {
        totalRows: 120000,
        uniqueApplications: 120000,
        uniqueCandidates: 80654,
        uniqueRequisitions: 8000,
      },
      statusMix: { active: 68324, hired: 20449, rejected: 31227 },
      redMetrics: [],
      amberMetrics: [],
      topFunnelStages: [],
      stageDistribution: [
        { stage: 'Interview', applications: 28000 },
        { stage: 'Offer', applications: 12000 },
      ],
      stageDistributionTotalApplications: 120000,
      stageDistributionNote:
        'Current stage distribution across applications. This is not a stage-to-stage conversion funnel; do not infer conversion rates without stage history.',
      applicationTypeByQuarter: [
        { quarter: '2025-Q1', total: 14000, internal: 3000, external: 10000, unknown: 1000 },
        { quarter: '2025-Q2', total: 15500, internal: 3200, external: 11200, unknown: 1100 },
      ],
      applicationTypeByQuarterNote:
        'Counts unique applications by quarter of Application_Date. Candidate type sourced from Candidate Type (Internal/External).',
      interactionTypeByQuarter: [
        {
          quarter: '2025-Q1',
          total: 4200,
          types: [
            { type: 'Screening Call', count: 2100 },
            { type: 'Follow-up', count: 1100 },
          ],
        },
      ],
      interactionTypeByQuarterNote:
        'Counts recruiter interactions by quarter of Interaction_Date, limited to candidates in the current filter scope.',
      weeklyTrend: {
        points: [],
        applicationsWoWChangePct: null,
        hiresWoWChangePct: null,
      },
      sourceMixTop: [
        { source: 'LinkedIn', applications: 31020, sharePct: 25.9 },
        { source: 'Agency', applications: 24666, sharePct: 20.6 },
      ],
      stageAgingTop: [],
    },
    metricTrends: {
      'metric.economics.cost_per_acquisition': [
        { week: '2025-W45', value: 15010 },
        { week: '2025-W46', value: 14790 },
        { week: '2025-W47', value: 14278 },
      ],
    },
  }
}

const TEST_CASES = [
  {
    id: 'missing_dimension_evidence',
    prompt: 'Compare Engineering vs Ground Services by Cost per Acquisition and give exact numbers.',
    evaluate: ({ text }) => {
      const ok = hasAny(text, ['unavailable', 'not available', 'apply filters', 'open filters', 'breakdown'])
      return {
        ok,
        reason: ok
          ? 'Response acknowledged missing segmented evidence or requested filtering.'
          : 'Response did not clearly acknowledge missing segmented evidence.',
      }
    },
  },
  {
    id: 'what_if_missing_data',
    prompt: 'What if we increase referral hiring by 20% next quarter? Give projected Skill Match and CPH.',
    evaluate: ({ text }) => {
      const ok = hasAny(text, [
        'estimate',
        'assumption',
        'directional',
        'missing',
        'cannot project',
        'insufficient',
        'not enough data',
        'depends on',
      ])
      return {
        ok,
        reason: ok
          ? 'Response labeled assumptions/uncertainty for what-if projection.'
          : 'Response did not explicitly label assumptions or missing inputs.',
      }
    },
  },
  {
    id: 'filter_tool_guidance',
    prompt: 'Show me only Dubai and compare it with Singapore.',
    evaluate: ({ text, toolCalls }) => {
      const calledOpenFilters = toolCalls.some((call) => call?.toolName === 'openFilters')
      const textSuggestsFilter = hasAny(text, ['open filters', 'apply filters', 'filter'])
      const ok = calledOpenFilters || textSuggestsFilter
      return {
        ok,
        reason: ok
          ? 'Response/tooling guided filter application.'
          : 'No filter tool call and no clear filter guidance in text.',
      }
    },
  },
  {
    id: 'stage_conversion_guardrail',
    prompt: 'Based on stage distribution, what is the conversion rate from Interview to Offer?',
    evaluate: ({ text }) => {
      const ok = hasAny(text, [
        'current-stage counts',
        'current stage distribution',
        'not a stage-to-stage conversion funnel',
        'not a conversion funnel',
        'cannot infer',
        'cannot calculate conversion',
        'without stage history',
      ])
      return {
        ok,
        reason: ok
          ? 'Response respected stage-distribution guardrail.'
          : 'Response did not clearly enforce stage-distribution guardrail.',
      }
    },
  },
]

function shouldRetry(reason) {
  const r = lower(reason)
  return (
    r.includes('aborted') ||
    r.includes('timeout') ||
    r.includes('fetch failed') ||
    r.includes('network')
  )
}

async function runCase(baseUrl, timeoutMs, testCase, verbose) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createContextPayload(testCase.prompt)),
      signal: controller.signal,
    })

    const elapsedMs = Date.now() - startedAt
    if (!response.ok) {
      const text = await response.text()
      return {
        id: testCase.id,
        ok: false,
        elapsedMs,
        reason: `HTTP ${response.status}: ${text.slice(0, 300)}`,
        responseText: '',
      }
    }

    const { text, toolCalls, events } = await readUiMessageEventStream(response)
    const verdict = testCase.evaluate({ text, toolCalls, events })

    return {
      id: testCase.id,
      ok: verdict.ok,
      elapsedMs,
      reason: verdict.reason,
      responseText: verbose ? text : text.slice(0, 300),
      toolCalls: toolCalls.map((call) => call.toolName),
    }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt
    return {
      id: testCase.id,
      ok: false,
      elapsedMs,
      reason: error instanceof Error ? error.message : String(error),
      responseText: '',
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runCaseWithRetries(baseUrl, timeoutMs, retries, testCase, verbose) {
  let last = null
  const maxAttempts = retries + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await runCase(baseUrl, timeoutMs, testCase, verbose)
    last = result

    if (result.ok) {
      return { ...result, attempts: attempt }
    }
    if (!shouldRetry(result.reason) || attempt === maxAttempts) {
      return { ...result, attempts: attempt }
    }
  }

  return { ...last, attempts: maxAttempts }
}

async function main() {
  const { baseUrl, timeoutMs, retries, verbose } = parseArgs()

  const results = []
  for (const testCase of TEST_CASES) {
    const result = await runCaseWithRetries(baseUrl, timeoutMs, retries, testCase, verbose)
    results.push(result)
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.length - passed

  const summary = {
    baseUrl,
    timeoutMs,
    retries,
    total: results.length,
    passed,
    failed,
    results,
  }

  console.log(JSON.stringify(summary, null, 2))
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  )
  process.exit(1)
})
