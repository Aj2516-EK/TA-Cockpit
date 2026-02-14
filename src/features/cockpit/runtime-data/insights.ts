import type { Metric } from '../model'
import { computeStageDistribution, computeWeeklyTrend, type WeeklyTrendPoint } from './charts'
import type { ApplicationFactRow, RawTableRow } from './types'

export type InsightMetricSnapshot = {
  id: string
  title: string
  valueText: string
  thresholdText: string
  rag: 'red' | 'amber' | 'green'
}

export type InsightContext = {
  summary: {
    totalRows: number
    uniqueApplications: number
    uniqueCandidates: number
    uniqueRequisitions: number
  }
  statusMix: {
    active: number
    hired: number
    rejected: number
  }
  redMetrics: InsightMetricSnapshot[]
  amberMetrics: InsightMetricSnapshot[]
  topFunnelStages: Array<{ stage: string; applications: number }>
  stageDistribution: Array<{ stage: string; applications: number }>
  stageDistributionTotalApplications: number
  stageDistributionNote: string
  applicationTypeByQuarter: Array<{
    quarter: string
    total: number
    internal: number
    external: number
    unknown: number
  }>
  applicationTypeByQuarterNote: string
  interactionTypeByQuarter: Array<{
    quarter: string
    total: number
    types: Array<{ type: string; count: number }>
  }>
  interactionTypeByQuarterNote: string
  weeklyTrend: {
    points: WeeklyTrendPoint[]
    applicationsWoWChangePct: number | null
    hiresWoWChangePct: number | null
  }
  sourceMixTop: Array<{ source: string; applications: number; sharePct: number }>
  stageAgingTop: Array<{ stage: string; sampleSize: number; p50Days: number; p90Days: number }>
}

function toAppKey(row: ApplicationFactRow, index: number): string {
  return row.applicationId ?? `row:${index}`
}

function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null
  return ((cur - prev) / prev) * 100
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const a = sorted[base] ?? sorted[sorted.length - 1]
  const b = sorted[base + 1] ?? a
  return a + rest * (b - a)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function toTrimmedString(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date && Number.isFinite(v.getTime())) return new Date(v.getTime())
  const s = toTrimmedString(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function quarterKey(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-Q${q}`
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

function compactMetric(m: Metric): InsightMetricSnapshot {
  return {
    id: m.id,
    title: m.title,
    valueText: m.valueText,
    thresholdText: m.thresholdText,
    rag: m.rag,
  }
}

export function computeInsightContext({
  rows,
  currentMetrics,
  recruiterActivityRows,
}: {
  rows: ApplicationFactRow[] | null
  currentMetrics: Metric[]
  recruiterActivityRows?: RawTableRow[]
}): InsightContext | null {
  if (!rows) return null

  const uniqueApplications = new Set<string>()
  const uniqueCandidates = new Set<string>()
  const uniqueRequisitions = new Set<string>()
  const statusActive = new Set<string>()
  const statusHired = new Set<string>()
  const statusRejected = new Set<string>()

  const sourceApps = new Map<string, Set<string>>()
  const stageDurations = new Map<string, number[]>()
  const appTypeByQuarter = new Map<
    string,
    { internal: Set<string>; external: Set<string>; unknown: Set<string> }
  >()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const appKey = toAppKey(row, i)
    uniqueApplications.add(appKey)
    if (row.candidateId) uniqueCandidates.add(row.candidateId)
    if (row.requisitionId) uniqueRequisitions.add(row.requisitionId)

    if (row.status === 'Active') statusActive.add(appKey)
    else if (row.status === 'Hired') statusHired.add(appKey)
    else if (row.status === 'Rejected') statusRejected.add(appKey)

    const source = row.source?.trim()
    if (source) {
      let set = sourceApps.get(source)
      if (!set) sourceApps.set(source, (set = new Set<string>()))
      set.add(appKey)
    }

    if (row.stageEnterDate && row.stageExitDate) {
      const delta = daysBetween(row.stageEnterDate, row.stageExitDate)
      if (Number.isFinite(delta) && delta >= 0) {
        const stage = row.currentStage?.trim() || 'Unknown'
        const values = stageDurations.get(stage) ?? []
        values.push(delta)
        stageDurations.set(stage, values)
      }
    }

    if (row.applicationDate) {
      const q = quarterKey(row.applicationDate)
      const bucket =
        appTypeByQuarter.get(q) ?? {
          internal: new Set<string>(),
          external: new Set<string>(),
          unknown: new Set<string>(),
        }
      if (!appTypeByQuarter.has(q)) appTypeByQuarter.set(q, bucket)
      if (row.candidateType === 'Internal') bucket.internal.add(appKey)
      else if (row.candidateType === 'External') bucket.external.add(appKey)
      else bucket.unknown.add(appKey)
    }
  }

  const stageDist = computeStageDistribution(rows)
  const weekly = computeWeeklyTrend(rows)
  const weeklyPoints = weekly.points.slice(-12)
  const last = weeklyPoints[weeklyPoints.length - 1]
  const prev = weeklyPoints[weeklyPoints.length - 2]

  const sourceMixTop = [...sourceApps.entries()]
    .map(([source, appIds]) => ({
      source,
      applications: appIds.size,
      sharePct: uniqueApplications.size > 0 ? (appIds.size / uniqueApplications.size) * 100 : 0,
    }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 5)
    .map((x) => ({ ...x, sharePct: round1(x.sharePct) }))

  const stageAgingTop = [...stageDurations.entries()]
    .map(([stage, values]) => {
      const sorted = values.slice().sort((a, b) => a - b)
      return {
        stage,
        sampleSize: sorted.length,
        p50Days: round1(quantile(sorted, 0.5)),
        p90Days: round1(quantile(sorted, 0.9)),
      }
    })
    .sort((a, b) => b.p90Days - a.p90Days)
    .slice(0, 5)

  const redMetrics = currentMetrics.filter((m) => m.rag === 'red').map(compactMetric)
  const amberMetrics = currentMetrics.filter((m) => m.rag === 'amber').map(compactMetric)

  const applicationTypeByQuarter = [...appTypeByQuarter.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([quarter, bucket]) => {
      const internal = bucket.internal.size
      const external = bucket.external.size
      const unknown = bucket.unknown.size
      return {
        quarter,
        internal,
        external,
        unknown,
        total: internal + external + unknown,
      }
    })

  const candidateIdsInScope = new Set(
    rows.map((r) => r.candidateId).filter((v): v is string => typeof v === 'string' && v.length > 0),
  )
  const interactionByQuarter = new Map<string, Map<string, number>>()
  if (recruiterActivityRows && recruiterActivityRows.length > 0) {
    for (const r of recruiterActivityRows) {
      const candidateId = toTrimmedString(r['Candidate_ID'])
      if (candidateIdsInScope.size > 0 && (!candidateId || !candidateIdsInScope.has(candidateId))) continue
      const date = toDate(r['Interaction_Date'])
      if (!date) continue
      const type = toTrimmedString(r['Interaction_Type']) ?? 'Unknown'
      const q = quarterKey(date)
      const byType = interactionByQuarter.get(q) ?? new Map<string, number>()
      if (!interactionByQuarter.has(q)) interactionByQuarter.set(q, byType)
      byType.set(type, (byType.get(type) ?? 0) + 1)
    }
  }

  const interactionTypeByQuarter = [...interactionByQuarter.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([quarter, byType]) => {
      const types = [...byType.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
      const total = types.reduce((sum, t) => sum + t.count, 0)
      return { quarter, total, types }
    })

  return {
    summary: {
      totalRows: rows.length,
      uniqueApplications: uniqueApplications.size,
      uniqueCandidates: uniqueCandidates.size,
      uniqueRequisitions: uniqueRequisitions.size,
    },
    statusMix: {
      active: statusActive.size,
      hired: statusHired.size,
      rejected: statusRejected.size,
    },
    redMetrics,
    amberMetrics,
    topFunnelStages: stageDist.points,
    stageDistribution: stageDist.points,
    stageDistributionTotalApplications: stageDist.totalApplications,
    stageDistributionNote:
      'Current stage distribution across applications. This is not a stage-to-stage conversion funnel; do not infer conversion rates without stage history.',
    applicationTypeByQuarter,
    applicationTypeByQuarterNote:
      'Counts unique applications by quarter of Application_Date. Candidate type sourced from Candidate Type (Internal/External).',
    interactionTypeByQuarter,
    interactionTypeByQuarterNote:
      'Counts recruiter interactions by quarter of Interaction_Date, limited to candidates in the current filter scope.',
    weeklyTrend: {
      points: weeklyPoints,
      applicationsWoWChangePct: last && prev ? pctChange(last.applications, prev.applications) : null,
      hiresWoWChangePct: last && prev ? pctChange(last.hires, prev.hires) : null,
    },
    sourceMixTop,
    stageAgingTop,
  }
}
