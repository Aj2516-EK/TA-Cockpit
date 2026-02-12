import type { Metric } from '../../model'
import type { ParsedThreshold } from '../../model/metricExplain'
import { ragColor } from './vizUtils'

/**
 * Horizontal bullet bar for time and cost metrics (lower-is-better).
 * Shows a fill bar + vertical threshold marker.
 */
export function BulletBar({
  metric,
  threshold,
}: {
  metric: Metric
  threshold: ParsedThreshold
}) {
  const value = metric.valueNum ?? 0
  const target = threshold.value ?? 0

  // Scale so both value and target are visible
  const maxScale = Math.max(value, target, 1) * 1.5
  const fillPct = Math.min((value / maxScale) * 100, 100)
  const targetPct = Math.min((target / maxScale) * 100, 100)

  const color = ragColor(metric.rag)

  return (
    <div className="relative mt-2 h-3">
      {/* Track */}
      <div className="absolute inset-0 rounded-full bg-slate-900/6 dark:bg-white/6" />

      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${fillPct}%`,
          backgroundColor: color,
          transition: 'width 0.6s ease',
        }}
      />

      {/* Threshold marker */}
      {target > 0 && (
        <div
          className="absolute top-[-3px] h-[18px] w-[2px] rounded-full bg-slate-500 dark:bg-slate-400"
          style={{ left: `${targetPct}%`, transition: 'left 0.6s ease' }}
        />
      )}
    </div>
  )
}
