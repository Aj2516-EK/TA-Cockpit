import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { Metric, ClusterId } from '../model'
import type { TrendPoint } from './trends'
import type { Filters } from './types'

type ExportRow = {
  cluster: string
  metricId: string
  title: string
  value: string
  rag: string
  threshold: string
  alarm: string
  insight: string
  action: string
  supportingFacts: string
  trendSummary: string
}

const CLUSTER_ORDER: ClusterId[] = ['readiness', 'momentum', 'experience', 'diversity', 'economics']

/** Summarize a trend array as "up 12% (last 3 vs prior 3 weeks)" or "stable" */
export function summarizeTrend(points: TrendPoint[]): string {
  if (points.length < 6) return points.length === 0 ? 'no data' : 'insufficient data'

  const recent = points.slice(-3)
  const prior = points.slice(-6, -3)

  const avgRecent = recent.reduce((s, p) => s + p.value, 0) / recent.length
  const avgPrior = prior.reduce((s, p) => s + p.value, 0) / prior.length

  if (avgPrior === 0) return avgRecent === 0 ? 'stable' : 'rising from zero'

  const pctChange = ((avgRecent - avgPrior) / Math.abs(avgPrior)) * 100
  const rounded = Math.round(Math.abs(pctChange) * 10) / 10

  if (Math.abs(pctChange) <= 5) return 'stable'
  const arrow = pctChange > 0 ? 'up' : 'down'
  return `${arrow} ${rounded}% (last 3 vs prior 3 weeks)`
}

/** Build export rows from current dashboard state */
export function buildExportRows(
  metricsByCluster: Record<ClusterId, Metric[]>,
  metricTrends: Record<string, TrendPoint[]>,
  filters: Filters,
): ExportRow[] {
  void filters
  const rows: ExportRow[] = []

  for (const cluster of CLUSTER_ORDER) {
    const metrics = metricsByCluster[cluster] ?? []
    for (const m of metrics) {
      rows.push({
        cluster,
        metricId: m.id,
        title: m.title,
        value: m.valueText,
        rag: m.rag,
        threshold: m.thresholdText,
        alarm: m.alarm,
        insight: m.insight,
        action: m.action,
        supportingFacts: (m.supportingFacts ?? []).join('; '),
        trendSummary: summarizeTrend(metricTrends[m.id] ?? []),
      })
    }
  }

  return rows
}

function buildFilterSummary(filters: Filters): string {
  const parts: string[] = []
  if (filters.dateFrom) parts.push(`From: ${filters.dateFrom}`)
  if (filters.dateTo) parts.push(`To: ${filters.dateTo}`)
  if (filters.businessUnit?.length) parts.push(`BU: ${filters.businessUnit.join(', ')}`)
  if (filters.location?.length) parts.push(`Location: ${filters.location.join(', ')}`)
  return parts.length > 0 ? parts.join(' | ') : 'No filters applied'
}

/** Generate an Excel workbook as a Blob */
export function exportMetricsToXlsx(
  metricsByCluster: Record<ClusterId, Metric[]>,
  metricTrends: Record<string, TrendPoint[]>,
  filters: Filters,
): Blob {
  const rows = buildExportRows(metricsByCluster, metricTrends, filters)

  // Prepend a header row with filter context
  const headerRow = { cluster: `TA Cockpit Export — ${buildFilterSummary(filters)}` } as ExportRow
  const sheetData = [headerRow, ...rows]

  const ws = XLSX.utils.json_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'TA Cockpit Metrics')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Generate CSV string */
export function exportMetricsToCsv(
  metricsByCluster: Record<ClusterId, Metric[]>,
  metricTrends: Record<string, TrendPoint[]>,
  filters: Filters,
): string {
  const rows = buildExportRows(metricsByCluster, metricTrends, filters)
  return Papa.unparse(rows)
}
