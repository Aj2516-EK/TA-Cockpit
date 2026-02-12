import type { ClusterId, Metric, Rag } from './types'
import { metricTemplatesByCluster } from './sampleData'
import type { ApplicationFactRow } from '../runtime-data/types'

export type ComputedMetric = Pick<Metric, 'valueText' | 'valueNum' | 'thresholdText' | 'rag' | 'supportingFacts'>

export const IMPLEMENTED_METRIC_IDS = new Set<string>([
  'metric.readiness.qualified_candidates_availability',
  'metric.readiness.skill_readiness',
  'metric.readiness.external_connections',
  'metric.readiness.time_to_present',
  'metric.readiness.critical_skill_capability',
  'metric.readiness.pool_variety',
  'metric.momentum.time_to_next_step',
  'metric.momentum.time_to_cv_response',
  'metric.momentum.time_spent_matching',
  'metric.momentum.recruiting_experience_rating',
  'metric.experience.incomplete_applications',
  'metric.experience.time_to_apply',
  'metric.experience.ease_of_applying',
  'metric.diversity.diverse_attraction',
  'metric.diversity.diverse_pipeline',
  'metric.diversity.active_applicants',
  'metric.economics.cost_per_acquisition',
  'metric.economics.presented_vs_offers',
  'metric.economics.job_posting_effectiveness',
  'metric.economics.hires_from_competitors',
  'metric.economics.hm_feedback_time',
  'metric.economics.jd_criteria_match',
  'metric.economics.interviewed_vs_offered',
])

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function fmtNumber(n: number, digits = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function fmtPct(pct0to100: number, digits = 1) {
  return `${fmtNumber(pct0to100, digits)}%`
}

function fmtDays(days: number, digits = 1) {
  return `${fmtNumber(days, digits)} days`
}

function fmtHours(hours: number, digits = 1) {
  return `${fmtNumber(hours, digits)} hrs`
}

function fmtMins(mins: number, digits = 1) {
  return `${fmtNumber(mins, digits)} mins`
}

function fmtCurrency(n: number) {
  // Dataset doesn't include currency; assume USD for display.
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function ragForLowerIsBetter(value: number, greenMax: number, amberMax: number): Rag {
  if (value <= greenMax) return 'green'
  if (value <= amberMax) return 'amber'
  return 'red'
}

function ragForHigherIsBetter(value: number, greenMin: number, amberMin: number): Rag {
  if (value >= greenMin) return 'green'
  if (value >= amberMin) return 'amber'
  return 'red'
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  const s = values.reduce((a, b) => a + b, 0)
  return s / values.length
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

function minsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60)
}

function uniqBy<T>(items: T[], key: (t: T) => string | null | undefined): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of items) {
    const k = key(it)
    if (!k) continue
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

const NARRATIVE_PENDING = {
  alarm: 'AI narrative pending.',
  insight: 'AI narrative pending.',
  action: 'AI narrative pending.',
} satisfies Pick<Metric, 'alarm' | 'insight' | 'action'>

export function computeMetric(metricId: string, rows: ApplicationFactRow[]): ComputedMetric | null {
  switch (metricId) {
    // --- Readiness ---
    case 'metric.readiness.qualified_candidates_availability': {
      // Qualified candidates per critical requisition (proxy for market depth).
      // Qualified = skill match >= 80 (proxy threshold) AND candidate joined.
      const qualifiedByReq = new Map<string, Set<string>>()
      const critReqs = new Set<string>()
      for (const r of rows) {
        if (r.criticalSkillFlag !== true) continue
        if (!r.requisitionId) continue
        critReqs.add(r.requisitionId)
        if (!r.candidateId) continue
        if (!isFiniteNumber(r.skillMatchPercentage)) continue
        if (r.skillMatchPercentage < 80) continue
        let s = qualifiedByReq.get(r.requisitionId)
        if (!s) qualifiedByReq.set(r.requisitionId, (s = new Set()))
        s.add(r.candidateId)
      }
      if (critReqs.size === 0) return null
      const perReq = [...critReqs].map((rid) => qualifiedByReq.get(rid)?.size ?? 0)
      const mean = avg(perReq)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 5.0, 3.5)
      return {
        valueNum: mean,
        valueText: fmtNumber(mean, 1),
        thresholdText: '> 5.0',
        rag,
        supportingFacts: [
          `Critical-skill requisitions: ${critReqs.size}`,
          `Qualified threshold: Skill_Match_Percentage >= 80`,
        ],
      }
    }
    case 'metric.readiness.skill_readiness': {
      // Average skill match percentage across unique candidates in the filtered pipeline.
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const values = uniq.map((r) => r.skillMatchPercentage).filter(isFiniteNumber)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 70, 66)
      return {
        valueNum: mean,
        valueText: fmtPct(mean, 0),
        thresholdText: '> 70%',
        rag,
        supportingFacts: [`Candidates with skill match %: ${values.length}`],
      }
    }
    case 'metric.readiness.external_connections': {
      // Unique external candidates with recruiter activity (proxy for active external network).
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const connected = uniq.filter(
        (r) =>
          r.candidateType === 'External' &&
          (((r.recruiterId ?? '').trim().length > 0) || (r.matchingHoursTotal ?? 0) > 0),
      )
      if (connected.length === 0) return null
      const n = connected.length
      const rag = ragForHigherIsBetter(n, 1000, 800)
      return {
        valueNum: n,
        valueText: fmtNumber(n, 0),
        thresholdText: '> 1,000',
        rag,
        supportingFacts: ['Proxy: unique External candidates with recruiter activity'],
      }
    }
    case 'metric.readiness.time_to_present': {
      // Proxy: for Critical Skill requisitions, days from req open -> first application date.
      const byReq = new Map<string, { open: Date; firstApp: Date }>()
      for (const r of rows) {
        if (r.criticalSkillFlag !== true) continue
        if (!r.requisitionId || !r.requisitionOpenDate || !r.applicationDate) continue
        const prev = byReq.get(r.requisitionId)
        if (!prev) {
          byReq.set(r.requisitionId, { open: r.requisitionOpenDate, firstApp: r.applicationDate })
        } else if (r.applicationDate < prev.firstApp) {
          prev.firstApp = r.applicationDate
        }
      }
      const deltas: number[] = []
      let negativeDropped = 0
      for (const v of byReq.values()) deltas.push(daysBetween(v.open, v.firstApp))
      const nonNegative = deltas.filter((d) => {
        if (d >= 0) return true
        negativeDropped++
        return false
      })
      const mean = avg(nonNegative)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 7.0, 9.0)
      return {
        valueNum: mean,
        valueText: fmtDays(mean, 1),
        thresholdText: '< 7.0 days',
        rag,
        supportingFacts: [
          `Critical-skill requisitions: ${byReq.size}`,
          negativeDropped > 0 ? `Dropped ${negativeDropped} negative deltas (application before open date)` : 'No negative deltas',
        ],
      }
    }
    case 'metric.readiness.critical_skill_capability': {
      // Proxy: % of critical-skill requisitions that have at least 1 hire.
      const critReqs = new Set<string>()
      const hiredCritReqs = new Set<string>()
      for (const r of rows) {
        if (r.criticalSkillFlag !== true) continue
        if (!r.requisitionId) continue
        critReqs.add(r.requisitionId)
        if (r.status === 'Hired') hiredCritReqs.add(r.requisitionId)
      }
      if (critReqs.size === 0) return null
      const pct = (hiredCritReqs.size / critReqs.size) * 100
      const rag = ragForHigherIsBetter(pct, 90, 84)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 90%',
        rag,
        supportingFacts: [
          `Critical-skill requisitions: ${critReqs.size}`,
          `With at least 1 hire: ${hiredCritReqs.size}`,
        ],
      }
    }
    case 'metric.readiness.pool_variety': {
      // Proxy: avg unique candidates per requisition.
      const perReq = new Map<string, Set<string>>()
      for (const r of rows) {
        if (!r.requisitionId || !r.candidateId) continue
        let s = perReq.get(r.requisitionId)
        if (!s) perReq.set(r.requisitionId, (s = new Set()))
        s.add(r.candidateId)
      }
      const values = [...perReq.values()].map((s) => s.size)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 10, 7)
      return {
        valueNum: mean,
        valueText: fmtNumber(mean, 1),
        thresholdText: '> 10',
        rag,
        supportingFacts: [`Requisitions: ${perReq.size}`],
      }
    }

    // --- Momentum ---
    case 'metric.momentum.time_to_next_step': {
      // Proxy: stage duration = Stage_Exit_Date - Stage_Enter_Date
      const deltas: number[] = []
      for (const r of rows) {
        if (!r.stageEnterDate || !r.stageExitDate) continue
        const d = daysBetween(r.stageEnterDate, r.stageExitDate)
        if (Number.isFinite(d) && d >= 0) deltas.push(d)
      }
      const mean = avg(deltas)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 5.0, 6.0)
      return {
        valueNum: mean,
        valueText: fmtDays(mean, 1),
        thresholdText: '< 5.0 days',
        rag,
        supportingFacts: [`Rows with stage enter/exit: ${deltas.length}`],
      }
    }
    case 'metric.momentum.time_to_cv_response': {
      const values = rows.map((r) => r.recruiterResponseTimeHours).filter(isFiniteNumber)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 24, 30)
      return {
        valueNum: mean,
        valueText: fmtHours(mean, 1),
        thresholdText: '< 24 hrs',
        rag,
        supportingFacts: [`Rows with response time: ${values.length}`],
      }
    }
    case 'metric.momentum.time_spent_matching': {
      // Derived from recruiter activity; use unique candidates to avoid duplicating per-application rows.
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const values = uniq.map((r) => r.matchingHoursTotal).filter(isFiniteNumber)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 6.0, 7.0)
      return {
        valueNum: mean,
        valueText: fmtHours(mean, 1),
        thresholdText: '< 6.0 hrs',
        rag,
        supportingFacts: [`Unique candidates with matching time: ${values.length}`],
      }
    }

    // --- Experience ---
    case 'metric.experience.incomplete_applications': {
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const withFlag = uniq.filter((r) => typeof r.applicationCompleted === 'boolean')
      if (withFlag.length === 0) return null
      const incomplete = withFlag.filter((r) => r.applicationCompleted === false).length
      const pct = (incomplete / withFlag.length) * 100
      const rag = ragForLowerIsBetter(pct, 20, 25)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '< 20%',
        rag,
        supportingFacts: [`Candidates with completion flag: ${withFlag.length}`],
      }
    }
    case 'metric.experience.time_to_apply': {
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const mins: number[] = []
      for (const r of uniq) {
        if (!r.applicationStartTime || !r.applicationSubmitTime) continue
        const m = minsBetween(r.applicationStartTime, r.applicationSubmitTime)
        if (Number.isFinite(m) && m >= 0) mins.push(m)
      }
      const mean = avg(mins)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 10, 12)
      return {
        valueNum: mean,
        valueText: fmtMins(mean, 1),
        thresholdText: '< 10 mins',
        rag,
        supportingFacts: [`Candidates with start/submit time: ${mins.length}`],
      }
    }
    case 'metric.experience.ease_of_applying': {
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const values = uniq.map((r) => r.applicationEaseRating).filter(isFiniteNumber)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 4.0, 3.8)
      return {
        valueNum: mean,
        valueText: `${fmtNumber(mean, 1)} / 5`,
        thresholdText: '> 4.0',
        rag,
        supportingFacts: [`Candidates with ease rating: ${values.length}`],
      }
    }
    case 'metric.momentum.recruiting_experience_rating': {
      const uniq = uniqBy(rows, (r) => r.candidateId)
      // Candidate_NPS in the workbook is 5-10. Convert to a 1-5 rating proxy.
      const values = uniq
        .map((r) => r.candidateNps)
        .filter(isFiniteNumber)
        .map((nps) => nps / 2)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 4.2, 4.0)
      return {
        valueNum: mean,
        valueText: `${fmtNumber(mean, 1)} / 5`,
        thresholdText: '> 4.2',
        rag,
        supportingFacts: [`Candidates with NPS: ${values.length}`, 'Proxy: Candidate_NPS / 2 (5-10 -> 2.5-5)'],
      }
    }

    // --- Diversity ---
    case 'metric.diversity.diverse_attraction': {
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const withFlag = uniq.filter((r) => typeof r.diversityFlag === 'boolean')
      if (withFlag.length === 0) return null
      const diverse = withFlag.filter((r) => r.diversityFlag === true).length
      const pct = (diverse / withFlag.length) * 100
      const rag = ragForHigherIsBetter(pct, 40, 35)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 40%',
        rag,
        supportingFacts: [`Candidates with diversity flag: ${withFlag.length}`],
      }
    }
    case 'metric.diversity.diverse_pipeline': {
      // Proxy: % of hires that are diverse (pipeline parity, late-stage outcome).
      const hired = rows.filter((r) => r.status === 'Hired')
      const uniqHired = uniqBy(hired, (r) => r.candidateId)
      const withFlag = uniqHired.filter((r) => typeof r.diversityFlag === 'boolean')
      if (withFlag.length === 0) return null
      const diverse = withFlag.filter((r) => r.diversityFlag === true).length
      const pct = (diverse / withFlag.length) * 100
      const rag = ragForHigherIsBetter(pct, 40, 32)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 40%',
        rag,
        supportingFacts: [`Hires with diversity flag: ${withFlag.length}`],
      }
    }
    case 'metric.diversity.active_applicants': {
      const active = rows.filter((r) => r.status === 'Active')
      const uniqActive = uniqBy(active, (r) => r.candidateId)
      const n = uniqActive.length
      if (!isFiniteNumber(n) || n <= 0) return null
      const rag = ragForHigherIsBetter(n, 8000, 6000)
      return {
        valueNum: n,
        valueText: fmtNumber(n, 0),
        thresholdText: '> 8,000',
        rag,
        supportingFacts: [`Active unique candidates: ${n}`],
      }
    }

    // --- Economics ---
    case 'metric.economics.cost_per_acquisition': {
      // Total hiring cost / total hires (cost per hire).
      // Sum cost per requisition once to avoid repeating across application rows.
      let totalCost = 0
      const seenReq = new Set<string>()
      for (const r of rows) {
        if (!r.requisitionId) continue
        if (seenReq.has(r.requisitionId)) continue
        if (!isFiniteNumber(r.totalHiringCost)) continue
        seenReq.add(r.requisitionId)
        totalCost += r.totalHiringCost
      }

      if (seenReq.size === 0) {
        return {
          valueText: 'N/A',
          valueNum: undefined,
          thresholdText: '< $2,500',
          rag: 'amber',
          supportingFacts: ['No hiring cost data in the current filter slice.'],
        }
      }

      const hireIds = new Set<string>()
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (r.status !== 'Hired') continue
        hireIds.add(r.applicationId ?? `row:${i}`)
      }
      const hireCount = hireIds.size
      if (!Number.isFinite(totalCost)) return null
      if (hireCount === 0) {
        return {
          valueText: 'N/A',
          valueNum: undefined,
          thresholdText: '< $2,500',
          rag: 'amber',
          supportingFacts: [
            `Total hiring cost (reqs with cost): ${seenReq.size}`,
            'No hires in the current filter slice (Status = Hired).',
          ],
        }
      }

      const cph = totalCost / hireCount
      const rag = ragForLowerIsBetter(cph, 4000, 4500)
      return {
        valueNum: cph,
        valueText: fmtCurrency(cph),
        thresholdText: '< $4,000',
        rag,
        supportingFacts: [
          `Hires: ${fmtNumber(hireCount, 0)}`,
          `Requisitions with cost: ${seenReq.size}`,
        ],
      }
    }
    case 'metric.economics.presented_vs_offers': {
      // Offer yield from presented/interviewed candidates.
      // Proxy: offers made / interviewed candidates (unique).
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const interviewed = uniq.filter((r) => r.interviewDate != null).length
      if (interviewed === 0) {
        return {
          valueText: 'N/A',
          valueNum: undefined,
          thresholdText: '> 25%',
          rag: 'amber',
          supportingFacts: ['No interviewed candidates in the current filter slice.'],
        }
      }
      const offers = uniq.filter((r) => r.offerMade === true).length
      const pct = (offers / interviewed) * 100
      const rag = ragForHigherIsBetter(pct, 25, 20)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 25%',
        rag,
        supportingFacts: [`Interviewed: ${interviewed}`, `Offers made: ${offers}`],
      }
    }
    case 'metric.economics.job_posting_effectiveness': {
      // From job posting analytics: applications received / views.
      const uniqReq = new Map<string, { views: number; apps: number }>()
      for (const r of rows) {
        if (!r.requisitionId) continue
        if (!isFiniteNumber(r.jobViews) || !isFiniteNumber(r.jobApplicationsReceived)) continue
        // Same values repeat per application row; keep one.
        if (uniqReq.has(r.requisitionId)) continue
        uniqReq.set(r.requisitionId, { views: r.jobViews, apps: r.jobApplicationsReceived })
      }
      let views = 0
      let apps = 0
      for (const v of uniqReq.values()) {
        views += v.views
        apps += v.apps
      }
      if (views <= 0) return null
      const pct = (apps / views) * 100
      const rag = ragForHigherIsBetter(pct, 8, 6)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 8%',
        rag,
        supportingFacts: [`Reqs with posting analytics: ${uniqReq.size}`, `Views: ${fmtNumber(views, 0)}`],
      }
    }
    case 'metric.economics.hires_from_competitors': {
      const hired = rows.filter((r) => r.status === 'Hired')
      const uniqHired = uniqBy(hired, (r) => r.candidateId)
      const withFlag = uniqHired.filter((r) => typeof r.isCompetitor === 'boolean')
      if (withFlag.length === 0) return null
      const competitors = withFlag.filter((r) => r.isCompetitor === true).length
      const pct = (competitors / withFlag.length) * 100
      const rag = ragForHigherIsBetter(pct, 15, 12)
      return {
        valueNum: pct,
        valueText: fmtPct(pct, 1),
        thresholdText: '> 15%',
        rag,
        supportingFacts: [`Hires with competitor flag: ${withFlag.length}`],
      }
    }
    case 'metric.economics.hm_feedback_time': {
      // Proxy: Feedback_Date - Interview_Date (days) from Interview_Offer sheet (joined by candidate).
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const deltas: number[] = []
      for (const r of uniq) {
        if (!r.interviewDate || !r.feedbackDate) continue
        const d = daysBetween(r.interviewDate, r.feedbackDate)
        if (Number.isFinite(d) && d >= 0) deltas.push(d)
      }
      const mean = avg(deltas)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForLowerIsBetter(mean, 2.0, 2.5)
      return {
        valueNum: mean,
        valueText: fmtDays(mean, 1),
        thresholdText: '< 2.0 days',
        rag,
        supportingFacts: [`Candidates with interview+feedback dates: ${deltas.length}`],
      }
    }
    case 'metric.economics.jd_criteria_match': {
      // Proxy: average candidate skill match % for candidates in the filtered pipeline.
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const values = uniq.map((r) => r.skillMatchPercentage).filter(isFiniteNumber)
      const mean = avg(values)
      if (!isFiniteNumber(mean)) return null
      const rag = ragForHigherIsBetter(mean, 75, 72)
      return {
        valueNum: mean,
        valueText: fmtPct(mean, 0),
        thresholdText: '> 75%',
        rag,
        supportingFacts: [`Candidates with skill match %: ${values.length}`],
      }
    }
    case 'metric.economics.interviewed_vs_offered': {
      // Ratio: 1 : (interviews / offers_made)
      const uniq = uniqBy(rows, (r) => r.candidateId)
      const interviewed = uniq.filter((r) => r.interviewDate != null).length
      const offers = uniq.filter((r) => r.offerMade === true).length
      if (interviewed === 0 || offers === 0) return null
      const ratio = interviewed / offers
      // Target 1 : 4 (i.e. ratio >= 4). Too low indicates over-offering; too high indicates low yield.
      const rag: Rag = ratio >= 4 ? 'green' : ratio >= 3 ? 'amber' : 'red'
      return {
        valueNum: ratio,
        valueText: `1 : ${fmtNumber(ratio, 1)}`,
        thresholdText: 'Target 1 : 4',
        rag,
        supportingFacts: [`Interviewed: ${interviewed}`, `Offers made: ${offers}`],
      }
    }
    default:
      return null
  }
}

export function computeMetricsByCluster({
  rows,
}: {
  rows: ApplicationFactRow[] | null
}): Record<ClusterId, Metric[]> {
  const templates = metricTemplatesByCluster
  const out: Record<ClusterId, Metric[]> = {
    readiness: [],
    momentum: [],
    experience: [],
    diversity: [],
    economics: [],
  }

  for (const clusterId of Object.keys(templates) as ClusterId[]) {
    out[clusterId] = templates[clusterId].map((tmpl) => {
      const computed = rows ? computeMetric(tmpl.id, rows) : null
      if (!computed) {
        const unavailableMetric: Metric = {
          ...tmpl,
          valueText: rows ? 'N/A' : '--',
          valueNum: undefined,
          thresholdText: rows ? 'N/A' : tmpl.thresholdText,
          rag: 'amber',
          supportingFacts: rows
            ? [
                IMPLEMENTED_METRIC_IDS.has(tmpl.id)
                  ? 'Not enough data for this filter slice, or missing required fields.'
                  : 'MVP: metric not implemented yet.',
              ]
            : undefined,
        }

        if (!rows) {
          return {
            ...unavailableMetric,
            alarm: 'Upload a dataset to generate KPI insights.',
            insight: 'Upload a dataset to generate KPI insights.',
            action: 'Upload a dataset to generate KPI insights.',
          }
        }

        const notImplemented = !IMPLEMENTED_METRIC_IDS.has(tmpl.id)
        return {
          ...unavailableMetric,
          alarm: notImplemented
            ? 'This KPI is not implemented yet in the current MVP.'
            : 'This KPI is unavailable for the current filter slice.',
          insight: notImplemented
            ? 'This tile is visible for roadmap completeness, but no runtime formula is attached yet.'
            : 'Required data is missing or filtered out for this KPI in the current view.',
          action: notImplemented
            ? 'Implement runtime computation logic for this KPI before relying on it for decisions.'
            : 'Broaden filters or verify required source columns are present in the uploaded dataset.',
        }
      }
      const computedMetric: Metric = {
        ...tmpl,
        valueText: computed.valueText,
        valueNum: computed.valueNum,
        thresholdText: computed.thresholdText,
        rag: computed.rag,
        supportingFacts: computed.supportingFacts,
      }
      return {
        ...computedMetric,
        ...NARRATIVE_PENDING,
      }
    })
  }

  return out
}
