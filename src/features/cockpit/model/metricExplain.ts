import type { Metric, Rag } from './types'

export type ParsedThreshold = {
  comparator: '<' | '>' | null
  value: number | null
  raw: string
}

export function parseThreshold(thresholdText: string): ParsedThreshold {
  const raw = thresholdText ?? ''
  const m = raw.match(/([<>])\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/)
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

export function meaningForMetric(metricId: string): { meaning: string; formula: string } {
  // Keep this minimal and readable; expand later as we formalize KPIs.
  switch (metricId) {
    case 'metric.readiness.qualified_candidates_availability':
      return {
        meaning:
          'How much qualified supply is immediately available for critical requisitions. Low values mean you will struggle to produce a credible slate fast.',
        formula:
          'Proxy: average qualified candidates per critical requisition (qualified = Skill_Match_Percentage >= 80).',
      }
    case 'metric.readiness.skill_readiness':
      return {
        meaning:
          'How “ready” the active pipeline is for the roles you are hiring. Low readiness usually shows up later as interview fallout and offer declines.',
        formula: 'Average Skill_Match_Percentage across unique candidates in the filtered pipeline.',
      }
    case 'metric.readiness.external_connections':
      return {
        meaning:
          'Size of your active external network. If this is low, sourcing will be reactive and your time-to-slate will drift.',
        formula: 'Proxy: unique External candidates with recruiter activity (recruiterId or matching hours).',
      }
    case 'metric.readiness.critical_skill_capability':
      return {
        meaning:
          'Whether you can actually deliver hires for critical-skill requisitions. If this is red, your workforce plan is at risk.',
        formula: 'Proxy: % of critical-skill requisitions that have at least 1 hire (Status = Hired).',
      }
    case 'metric.readiness.time_to_present':
      return {
        meaning:
          'How quickly you can present a qualified slate for critical skills. If this is red, you are likely to breach SLAs and lose candidates to competitors.',
        formula: 'Proxy: mean days from requisition open date to first application date (critical-skill reqs only).',
      }
    case 'metric.readiness.pool_variety':
      return {
        meaning:
          'Depth and variety of the talent pool per requisition. Low variety means the pipeline is narrow and vulnerable to rejection/declines.',
        formula: 'Proxy: average unique candidates per requisition.',
      }

    case 'metric.momentum.time_to_next_step':
      return {
        meaning:
          'How fast candidates move from one stage to the next. Slow movement usually increases drop-off and reduces acceptance rates.',
        formula: 'Proxy: mean stage duration (Stage_Exit_Date - Stage_Enter_Date).',
      }
    case 'metric.momentum.time_to_cv_response':
      return {
        meaning:
          'How quickly recruiters acknowledge/respond after CV submission. Long delays directly hurt candidate experience and conversion.',
        formula: 'Mean Recruiter_Response_Time (hours).',
      }
    case 'metric.momentum.time_spent_matching':
      return {
        meaning:
          'Recruiter effort spent matching candidates to roles. Rising values signal process inefficiency or poor data/skill tagging.',
        formula: 'Proxy: average matching hours per unique candidate (from recruiter activity).',
      }
    case 'metric.momentum.recruiting_experience_rating':
      return {
        meaning:
          'Candidate sentiment about the recruiting experience. A leading indicator for offer acceptance and referral health.',
        formula: 'Proxy: Candidate_NPS / 2 mapped to a 1-5 scale.',
      }

    case 'metric.experience.incomplete_applications':
      return {
        meaning:
          'Application abandonment rate. High abandonment reduces supply and introduces bias (only the most persistent complete).',
        formula: 'Percent of candidates with Application_Completed = N (unique candidates).',
      }
    case 'metric.experience.time_to_apply':
      return {
        meaning:
          'How long it takes candidates to finish an application. Long times usually indicate friction, poor mobile UX, or unnecessary fields.',
        formula: 'Mean minutes between Application_Start_Time and Application_Submit_Time (unique candidates).',
      }
    case 'metric.experience.ease_of_applying':
      return {
        meaning:
          'Self-reported ease of applying. Low scores are a direct signal to simplify the funnel and reduce form friction.',
        formula: 'Average Application_Ease_Rating (unique candidates).',
      }

    case 'metric.diversity.diverse_attraction':
      return {
        meaning:
          'How diverse the top-of-funnel is. If attraction is low, downstream diversity outcomes will not recover without intervention.',
        formula: '% of candidates with Diversity_Flag = Y (unique candidates).',
      }
    case 'metric.diversity.diverse_pipeline':
      return {
        meaning:
          'Diversity parity at the outcome stage. If this is lower than attraction, you likely have conversion bias or process friction.',
        formula: 'Proxy: % of hires who are diverse (Status = Hired, unique candidates).',
      }
    case 'metric.diversity.active_applicants':
      return {
        meaning:
          'Current active candidate inventory. If this is low, you will see volatility in downstream stages.',
        formula: 'Count of unique candidates with Status = Active.',
      }

    case 'metric.economics.cost_per_acquisition':
      return {
        meaning:
          'Cost efficiency of hiring. Rising CPA can indicate channel mix issues, excessive paid spend, or low conversion.',
        formula: 'Total hiring cost per hire (sum cost per requisition once / unique hires).',
      }
    case 'metric.economics.presented_vs_offers':
      return {
        meaning:
          'Offer yield from presented/interviewed candidates. Low yield means too many candidates reach panels without converting to offers.',
        formula: 'Proxy: offers made / interviewed candidates (unique), shown as a percent.',
      }
    case 'metric.economics.job_posting_effectiveness':
      return {
        meaning:
          'How effectively job postings convert views into applications. Low effectiveness means weak targeting or poor job content/UX.',
        formula: 'Applications_Received / Job_Views (aggregated per requisition).',
      }
    case 'metric.economics.hires_from_competitors':
      return {
        meaning:
          'Market capture rate: how many hires are coming from competitors. This can be positive (market pull) but may increase comp pressure.',
        formula: '% of hires where Is_Competitor = Y (unique hires).',
      }
    case 'metric.economics.hm_feedback_time':
      return {
        meaning:
          'Hiring manager feedback latency. Slow feedback is one of the most common causes of candidate drop-off and offer losses.',
        formula: 'Proxy: mean days from Interview_Date to Feedback_Date (unique candidates).',
      }
    case 'metric.economics.jd_criteria_match':
      return {
        meaning:
          'How well candidate profiles match the job description criteria. Low match suggests sourcing misalignment or unclear JD requirements.',
        formula: 'Average Skill_Match_Percentage across unique candidates.',
      }
    case 'metric.economics.interviewed_vs_offered':
      return {
        meaning:
          'Interview yield: how many interviews are required to produce an offer. Poor yield increases cost and time-to-fill.',
        formula: 'Ratio proxy: Interviews / Offers (unique candidates).',
      }
  }

  return {
    meaning:
      'A KPI tile that summarizes a part of the TA system. Use the value, threshold, and supporting facts to interpret.',
    formula: 'See supporting facts for the current computation inputs/proxies.',
  }
}
