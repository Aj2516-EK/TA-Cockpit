import { ragColor } from './vizUtils'
import type { Rag } from '../../model'

export type SparklinePoint = { week: string; value: number }

/**
 * Compact SVG sparkline with a subtle fill gradient.
 * Shows the trend over the last N weeks for a metric.
 */
export function Sparkline({
  points,
  rag,
  thresholdValue,
}: {
  points: SparklinePoint[]
  rag: Rag
  thresholdValue?: number | null
}) {
  if (points.length < 2) return null

  const values = points.map((p) => p.value)
  const min = Math.min(...values, thresholdValue ?? Infinity)
  const max = Math.max(...values, thresholdValue ?? -Infinity)
  const range = max - min || 1

  const w = 140
  const h = 36
  const padY = 4
  const innerH = h - padY * 2

  const toX = (i: number) => (i / (points.length - 1)) * w
  const toY = (v: number) => padY + innerH - ((v - min) / range) * innerH

  // Build the polyline path
  const linePoints = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ')

  // Area fill path (closed at bottom)
  const areaPath = [
    `M 0,${toY(points[0].value)}`,
    ...points.map((p, i) => `L ${toX(i)},${toY(p.value)}`),
    `L ${w},${h}`,
    `L 0,${h}`,
    'Z',
  ].join(' ')

  const color = ragColor(rag)
  const gradientId = `spark-grad-${rag}`

  // Threshold Y line
  const thresholdY =
    typeof thresholdValue === 'number' ? toY(thresholdValue) : null

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Threshold dashed line */}
        {thresholdY !== null && (
          <line
            x1={0}
            y1={thresholdY}
            x2={w}
            y2={thresholdY}
            stroke="currentColor"
            strokeWidth={0.8}
            strokeDasharray="3,3"
            className="text-slate-400 dark:text-slate-500"
          />
        )}

        {/* Main line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End dot */}
        <circle
          cx={toX(points.length - 1)}
          cy={toY(points[points.length - 1].value)}
          r={2.5}
          fill={color}
        />
      </svg>

      <div className="mt-0.5 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
        <span>{points.length}w trend</span>
        {points.length >= 2 && (() => {
          const first = points[0].value
          const last = points[points.length - 1].value
          const delta = last - first
          const sign = delta >= 0 ? '+' : ''
          const pctChange = first !== 0 ? ((delta / Math.abs(first)) * 100) : 0
          return (
            <span style={{ color }}>
              {sign}{pctChange.toFixed(0)}%
            </span>
          )
        })()}
      </div>
    </div>
  )
}
