import type { Rag } from '../model/types'
import type { ApplicationFactRow } from './types'
import { computeMetric } from '../model/runtimeMetrics'
import { METRIC_BREAKDOWN_DIMENSIONS, DIMENSION_LABELS, type BreakdownDimensionKey } from './breakdownConfig'

/** A single bar in a breakdown chart. */
export type BreakdownBarData = {
  dimensionValue: string
  valueNum: number
  valueText: string
  rag: Rag
  rowCount: number
}

/** One dimension's full breakdown for a metric. */
export type DimensionBreakdown = {
  dimension: BreakdownDimensionKey
  dimensionLabel: string
  bars: BreakdownBarData[]
  overallValueNum: number
  overallRag: Rag
}

const MAX_BARS = 10
const MAX_BREAKDOWNS = 3
const MIN_DISTINCT_VALUES = 2

/**
 * Check whether a dimension has at least `MIN_DISTINCT_VALUES` distinct non-null
 * values in the given rows. Short-circuits after finding enough.
 */
function hasEnoughDistinctValues(rows: ApplicationFactRow[], dim: BreakdownDimensionKey): boolean {
  const seen = new Set<string>()
  for (const r of rows) {
    const v = r[dim]
    if (v == null) continue
    const s = String(v)
    if (s.length === 0) continue
    seen.add(s)
    if (seen.size >= MIN_DISTINCT_VALUES) return true
  }
  return false
}

/**
 * Group rows by a dimension key, returning a Map of dimensionValue → rows.
 * Rows with null/empty dimension values are skipped.
 */
function groupBy(rows: ApplicationFactRow[], dim: BreakdownDimensionKey): Map<string, ApplicationFactRow[]> {
  const groups = new Map<string, ApplicationFactRow[]>()
  for (const r of rows) {
    const v = r[dim]
    if (v == null) continue
    const s = String(v)
    if (s.length === 0) continue
    let arr = groups.get(s)
    if (!arr) {
      arr = []
      groups.set(s, arr)
    }
    arr.push(r)
  }
  return groups
}

/**
 * Compute dimensional breakdowns for a metric.
 *
 * For each priority dimension (from breakdownConfig), groups the filtered rows,
 * runs `computeMetric` per group, and returns the first `MAX_BREAKDOWNS`
 * dimensions that produce valid results.
 */
export function computeBreakdowns(
  metricId: string,
  rows: ApplicationFactRow[],
  overallValueNum: number,
  overallRag: Rag,
): DimensionBreakdown[] {
  const priorityDims = METRIC_BREAKDOWN_DIMENSIONS[metricId]
  if (!priorityDims) return []

  const results: DimensionBreakdown[] = []

  for (const dim of priorityDims) {
    if (results.length >= MAX_BREAKDOWNS) break

    // Fast check: does this dimension have enough variety?
    if (!hasEnoughDistinctValues(rows, dim)) continue

    const groups = groupBy(rows, dim)
    const bars: BreakdownBarData[] = []

    for (const [dimValue, groupRows] of groups) {
      const computed = computeMetric(metricId, groupRows)
      if (!computed || typeof computed.valueNum !== 'number') continue
      bars.push({
        dimensionValue: dimValue,
        valueNum: computed.valueNum,
        valueText: computed.valueText,
        rag: computed.rag,
        rowCount: groupRows.length,
      })
    }

    // Need at least 2 bars for a meaningful breakdown
    if (bars.length < MIN_DISTINCT_VALUES) continue

    // Sort by row count descending (largest groups first), cap at MAX_BARS
    bars.sort((a, b) => b.rowCount - a.rowCount)
    const capped = bars.slice(0, MAX_BARS)

    results.push({
      dimension: dim,
      dimensionLabel: DIMENSION_LABELS[dim],
      bars: capped,
      overallValueNum,
      overallRag,
    })
  }

  return results
}
