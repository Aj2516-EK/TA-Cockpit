import { useMemo } from 'react'
import type { Metric } from '../model'
import { sortRag } from '../model'
import { MetricCard, type MetricAssignment } from './MetricCard'

export function MetricsGrid({
  metrics,
  expanded,
  onToggleMetric,
  onVisualizeMetric,
  assignments,
  onAssignMetric,
  onClearAssignment,
}: {
  metrics: Metric[]
  expanded: Record<string, boolean>
  onToggleMetric: (metricId: string) => void
  onVisualizeMetric: (metricId: string) => void
  assignments: Record<string, MetricAssignment>
  onAssignMetric: (metricId: string, assignment: MetricAssignment) => void
  onClearAssignment: (metricId: string) => void
}) {
  const ordered = useMemo(() => metrics.slice().sort((a, b) => sortRag(a.rag) - sortRag(b.rag)), [metrics])

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {ordered.map((m) => (
        <MetricCard
          key={m.id}
          metric={m}
          expanded={!!expanded[m.id]}
          onToggle={() => onToggleMetric(m.id)}
          onVisualize={() => onVisualizeMetric(m.id)}
          assignment={assignments[m.id]}
          onAssign={(assignment) => onAssignMetric(m.id, assignment)}
          onClearAssignment={() => onClearAssignment(m.id)}
        />
      ))}
    </div>
  )
}
