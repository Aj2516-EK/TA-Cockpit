import type { Metric, Rag } from './types'

export type ParsedThreshold = {
  comparator: '<' | '>' | null
  value: number | null
  raw: string
}

export function parseThreshold(thresholdText: string): ParsedThreshold {
  const raw = thresholdText ?? ''
  const m = raw.match(/([<>])\s*(?:[A-Z]{3}\s*)?\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i)
  if (!m) return { comparator: null, value: null, raw }
  const comparator = (m[1] as '<' | '>') ?? null
  const value = Number(String(m[2]).replace(/,/g, ''))
  return { comparator, value: Number.isFinite(value) ? value : null, raw }
}

function fmt(n: number, digits = 1) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function gapToTargetText(metric: Metric): string | null {
  if (typeof metric.valueNum !== 'number') return null
  const t = parseThreshold(metric.thresholdText)
  if (!t.comparator || typeof t.value !== 'number') return null

  const v = metric.valueNum
  const target = t.value

  if (t.comparator === '>') {
    const diff = v - target
    if (diff >= 0) return `Above target by ${fmt(diff)}`
    const pct = (Math.abs(diff) / Math.max(target, 1e-9)) * 100
    return `Below target by ${fmt(Math.abs(diff))} (${fmt(pct, 0)}%)`
  }

  // '<' lower is better
  const diff = v - target
  if (diff <= 0) return `Better than target by ${fmt(Math.abs(diff))}`
  const pct = (diff / Math.max(target, 1e-9)) * 100
  return `Over target by ${fmt(diff)} (${fmt(pct, 0)}%)`
}

export function ragLabel(rag: Rag): string {
  if (rag === 'red') return 'Critical'
  if (rag === 'amber') return 'Watch'
  return 'Healthy'
}

export function meaningForMetric(metricId: string): { meaning: string; formula: string; threshold: string } {
  switch (metricId) {
    case 'metric.readiness.qualified_candidates_availability':
      return {
        meaning:
          'Supply coverage: how much qualified supply is immediately available for critical requisitions. Low values mean you will struggle to produce a credible slate fast.',
        formula: 'Qualified Candidates / Open Critical Roles',
        threshold: '>= 5 per role',
      }
    case 'metric.readiness.skill_readiness':
      return {
        meaning:
          'Quality index: how ready the active pipeline is for the roles you are hiring. Low readiness usually shows up later as interview fallout and offer declines.',
        formula: 'Candidates Meeting Skill Criteria / Total Talent Pool x 100',
        threshold: '>= 70%',
      }
    case 'metric.readiness.external_connections':
      return {
        meaning:
          'Network strength: size of your active external network. If this is low, sourcing will be reactive and your time-to-slate will drift.',
        formula: 'Active Recruiter-Candidate Touchpoints (30 days)',
        threshold: 'Increasing month-over-month',
      }
    case 'metric.readiness.critical_skill_capability':
      return {
        meaning:
          'Capability ratio: whether you can actually deliver hires for critical-skill requisitions. If this is red, your workforce plan is at risk.',
        formula: 'Critical Roles Filled / Critical Roles Open',
        threshold: '>= 90%',
      }
    case 'metric.readiness.time_to_present':
      return {
        meaning:
          'Speed KPI: how quickly you can present a qualified slate for critical skills. If this is red, you are likely to breach SLAs and lose candidates.',
        formula: 'Avg(Days from Requisition Open to First Qualified CV)',
        threshold: '<= 7 days',
      }
    case 'metric.readiness.pool_variety':
      return {
        meaning:
          'Depth index: depth and variety of the talent pool. Low variety means the pipeline is narrow and vulnerable to rejection/declines.',
        formula: 'Unique Candidates x Skill Diversity Index',
        threshold: '>= Baseline +10% YoY',
      }

    case 'metric.momentum.time_to_next_step':
      return {
        meaning:
          'Momentum: how fast candidates move from one stage to the next. Slow movement usually increases drop-off and reduces acceptance rates.',
        formula: 'Avg(Days between pipeline stages)',
        threshold: '<= 3 days',
      }
    case 'metric.momentum.time_to_cv_response':
      return {
        meaning:
          'SLA: how quickly recruiters acknowledge/respond after CV submission. Long delays directly hurt candidate experience and conversion.',
        formula: 'Avg(Time from CV Submission to Recruiter Response)',
        threshold: '<= 24 hours',
      }
    case 'metric.momentum.time_spent_matching':
      return {
        meaning:
          'Efficiency: recruiter effort spent matching candidates to roles. Rising values signal process inefficiency or poor data/skill tagging.',
        formula: 'Avg(Time recruiter spends matching per role)',
        threshold: '<= 6 hours',
      }
    case 'metric.momentum.recruiting_experience_rating':
      return {
        meaning:
          'Experience: candidate sentiment about the recruiting experience. A leading indicator for offer acceptance and referral health.',
        formula: 'Avg(Candidate NPS / Rating)',
        threshold: '>= 4.2 / 5',
      }

    case 'metric.experience.incomplete_applications':
      return {
        meaning:
          'Friction: application abandonment rate. High abandonment reduces supply and introduces bias (only the most persistent complete).',
        formula: 'Abandoned Applications / Started Applications x 100',
        threshold: '<= 15%',
      }
    case 'metric.experience.time_to_apply':
      return {
        meaning:
          'Usability: how long it takes candidates to finish an application. Long times indicate friction, poor mobile UX, or unnecessary fields.',
        formula: 'Avg(Time spent to submit application)',
        threshold: '<= 10 minutes',
      }
    case 'metric.experience.ease_of_applying':
      return {
        meaning:
          'Experience: self-reported ease of applying. Low scores are a direct signal to simplify the funnel and reduce form friction.',
        formula: 'Avg(Application UX Score)',
        threshold: '>= 4.0 / 5',
      }

    case 'metric.diversity.diverse_attraction':
      return {
        meaning:
          'Inclusion: gender mix at the top of funnel. If female attraction is low, downstream gender balance will not recover without intervention.',
        formula: 'Diverse Applicants / Total Applicants x 100',
        threshold: '>= Market Benchmark',
      }
    case 'metric.diversity.diverse_pipeline':
      return {
        meaning:
          'Pipeline health: gender parity across the pipeline. If this is lower than attraction, you likely have conversion bias or process friction.',
        formula: 'Diverse Candidates in Pipeline / Total Pipeline x 100',
        threshold: '>= 40%',
      }
    case 'metric.diversity.active_applicants':
      return {
        meaning:
          'Demand signal: current active candidate inventory. If this is low, you will see volatility in downstream stages.',
        formula: 'Applicants Active in Last 30 Days',
        threshold: 'Increasing quarter-over-quarter',
      }

    case 'metric.economics.cost_per_acquisition':
      return {
        meaning:
          'Cost efficiency: cost per hire. Rising CPA can indicate channel mix issues, excessive paid spend, or low conversion.',
        formula: 'Total Hiring Cost / Total Hires',
        threshold: '<= Budget',
      }
    case 'metric.economics.presented_vs_offers':
      return {
        meaning:
          'Conversion: offer yield from presented candidates. Low yield means too many candidates reach panels without converting to offers.',
        formula: 'Offers Made / Candidates Presented x 100',
        threshold: '>= 25%',
      }
    case 'metric.economics.job_posting_effectiveness':
      return {
        meaning:
          'Attraction: how effectively job postings convert views into applications. Low effectiveness means weak targeting or poor job content/UX.',
        formula: 'Applicants / Job Views',
        threshold: '>= 8%',
      }
    case 'metric.economics.hires_from_competitors':
      return {
        meaning:
          'Market pull: how many hires are coming from competitors. This can be positive but may increase comp pressure.',
        formula: 'Competitor Hires / Total Hires x 100',
        threshold: 'Contextual',
      }
    case 'metric.economics.hm_feedback_time':
      return {
        meaning:
          'SLA: hiring manager feedback latency. Slow feedback is one of the most common causes of candidate drop-off and offer losses.',
        formula: 'Avg(Time from Interview to Feedback)',
        threshold: '<= 2 days',
      }
    case 'metric.economics.jd_criteria_match':
      return {
        meaning:
          'Fit quality: how well candidate profiles match the job description criteria. Low match suggests sourcing misalignment or unclear JD requirements.',
        formula: 'Skills Matched / Skills Required x 100',
        threshold: '>= 75%',
      }
    case 'metric.economics.interviewed_vs_offered':
      return {
        meaning:
          'Process efficiency: how many interviews are required to produce an offer. Poor yield increases cost and time-to-fill.',
        formula: 'Offers / Interviews',
        threshold: '>= 1:4',
      }
  }

  return {
    meaning:
      'A KPI tile that summarizes a part of the TA system. Use the value, threshold, and supporting facts to interpret.',
    formula: 'See supporting facts for the current computation inputs/proxies.',
    threshold: 'See metric card for current threshold.',
  }
}
