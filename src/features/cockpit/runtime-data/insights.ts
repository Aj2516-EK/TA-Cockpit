import type { Metric } from '../model'
import { computeStageDistribution, computeWeeklyTrend, type WeeklyTrendPoint } from './charts'
import type { ApplicationFactRow } from './types'

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
}: {
  rows: ApplicationFactRow[] | null
  currentMetrics: Metric[]
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
    topFunnelStages: stageDist.points.slice(0, 6),
    weeklyTrend: {
      points: weeklyPoints,
      applicationsWoWChangePct: last && prev ? pctChange(last.applications, prev.applications) : null,
      hiresWoWChangePct: last && prev ? pctChange(last.hires, prev.hires) : null,
    },
    sourceMixTop,
    stageAgingTop,
  }
}
