import { useMemo } from 'react'
import type { Metric } from '../../model'
import type { ApplicationFactRow } from '../../runtime-data/types'
import { computeBreakdowns } from '../../runtime-data/breakdowns'
import { BreakdownBarChart } from './BreakdownBarChart'

/**
 * Container that computes dimensional breakdowns for a metric and renders
 * up to 3 BreakdownBarChart components. Returns null if no breakdowns
 * are available (graceful no-op).
 */
export function BreakdownCharts({
  metric,
  rows,
}: {
  metric: Metric
  rows: ApplicationFactRow[] | null
}) {
  const breakdowns = useMemo(() => {
    if (!rows || rows.length === 0) return []
    if (typeof metric.valueNum !== 'number') return []
    return computeBreakdowns(metric.id, rows, metric.valueNum, metric.rag)
  }, [metric.id, metric.valueNum, metric.rag, rows])

  if (breakdowns.length === 0) return null

  return (
    <div className="space-y-4">
      {breakdowns.map((bd) => (
        <BreakdownBarChart key={bd.dimension} breakdown={bd} />
      ))}
    </div>
  )
}
