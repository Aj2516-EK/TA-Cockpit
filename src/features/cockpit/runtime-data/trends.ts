import type { ApplicationFactRow } from './types'
import { computeMetric } from '../model/runtimeMetrics'

/** ISO-week key: "2026-W07" */
function isoWeekKey(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const dayOfYear = Math.floor((d.getTime() - jan4.getTime()) / 86_400_000)
  const week = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Pick the best date to assign a row to a week bucket. */
function rowDate(r: ApplicationFactRow): Date | null {
  return r.applicationDate ?? r.stageEnterDate ?? r.interviewDate ?? null
}

export type TrendPoint = { week: string; value: number }

/**
 * Compute a metric's value per ISO week, returning the last `maxWeeks` data
 * points (sorted chronologically).  Weeks where the metric cannot be computed
 * (null / insufficient data) are omitted.
 */
export function computeMetricTrend(
  metricId: string,
  rows: ApplicationFactRow[],
  maxWeeks = 12,
): TrendPoint[] {
  // Group rows by ISO week
  const buckets = new Map<string, ApplicationFactRow[]>()
  for (const r of rows) {
    const d = rowDate(r)
    if (!d) continue
    const key = isoWeekKey(d)
    let bucket = buckets.get(key)
    if (!bucket) buckets.set(key, (bucket = []))
    bucket.push(r)
  }

  // Compute metric per week
  const points: TrendPoint[] = []
  for (const [week, weekRows] of buckets) {
    const result = computeMetric(metricId, weekRows)
    if (result && typeof result.valueNum === 'number') {
      points.push({ week, value: result.valueNum })
    }
  }

  // Sort chronologically and take the last N
  points.sort((a, b) => a.week.localeCompare(b.week))
  return points.slice(-maxWeeks)
}

/**
 * Batch-compute weekly trends for multiple metrics at once.
 * Shares the row-grouping step across all metrics for efficiency.
 */
export function computeAllMetricTrends(
  metricIds: string[],
  rows: ApplicationFactRow[],
  maxWeeks = 12,
): Record<string, TrendPoint[]> {
  // Group rows by ISO week (once)
  const buckets = new Map<string, ApplicationFactRow[]>()
  for (const r of rows) {
    const d = rowDate(r)
    if (!d) continue
    const key = isoWeekKey(d)
    let bucket = buckets.get(key)
    if (!bucket) buckets.set(key, (bucket = []))
    bucket.push(r)
  }

  const sortedWeeks = [...buckets.keys()].sort()
  const recentWeeks = sortedWeeks.slice(-maxWeeks)

  const out: Record<string, TrendPoint[]> = {}
  for (const metricId of metricIds) {
    const points: TrendPoint[] = []
    for (const week of recentWeeks) {
      const weekRows = buckets.get(week)!
      const result = computeMetric(metricId, weekRows)
      if (result && typeof result.valueNum === 'number') {
        points.push({ week, value: result.valueNum })
      }
    }
    out[metricId] = points
  }
  return out
}
