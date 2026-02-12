import type { Metric } from '../../model'
import type { ParsedThreshold } from '../../model/metricExplain'
import { ragColor } from './vizUtils'

/**
 * Semi-circular gauge for percentage metrics (0–100 scale).
 * Filled arc colored by RAG, with a threshold needle.
 */
export function GaugeArc({
  metric,
  threshold,
}: {
  metric: Metric
  threshold: ParsedThreshold
}) {
  const value = metric.valueNum ?? 0
  const target = threshold.value ?? 0
  const lowerIsBetter = threshold.comparator === '<'

  // Clamp to 0–100 for the arc
  const pct = Math.min(Math.max(value, 0), 100) / 100
  const targetPct = Math.min(Math.max(target, 0), 100) / 100

  // Arc geometry: 180-degree semi-circle
  const width = 120
  const height = 68
  const cx = 60
  const cy = 60
  const r = 48
  const strokeW = 7

  // Semi-circle arc length
  const halfCirc = Math.PI * r

  // Fill length
  const fillLen = halfCirc * pct
  const emptyLen = halfCirc - fillLen

  // Threshold needle angle (0 = left, PI = right for a top semi-circle)
  const needleAngle = Math.PI * (1 - targetPct) // SVG arc goes left-to-right when rotated
  const needleX1 = cx + (r - strokeW) * Math.cos(needleAngle)
  const needleY1 = cy - (r - strokeW) * Math.sin(needleAngle)
  const needleX2 = cx + (r + strokeW) * Math.cos(needleAngle)
  const needleY2 = cy - (r + strokeW) * Math.sin(needleAngle)

  const color = ragColor(metric.rag)

  return (
    <div className="mt-2 flex items-end justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[140px]"
        aria-hidden="true"
      >
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
          className="text-slate-900/8 dark:text-white/8"
        />

        {/* Filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${fillLen} ${emptyLen}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />

        {/* Threshold needle */}
        {target > 0 && (
          <line
            x1={needleX1}
            y1={needleY1}
            x2={needleX2}
            y2={needleY2}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="text-slate-500 dark:text-slate-400"
          />
        )}
      </svg>

      {lowerIsBetter && (
        <span className="absolute bottom-0 text-[8px] font-medium text-slate-400 dark:text-slate-500">
          lower is better
        </span>
      )}
    </div>
  )
}
