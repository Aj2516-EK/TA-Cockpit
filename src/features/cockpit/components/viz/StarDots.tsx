import type { Metric } from '../../model'
import type { ParsedThreshold } from '../../model/metricExplain'
import { ragColor } from './vizUtils'

/**
 * Five-dot rating display for 1–5 scale metrics.
 * Filled dots up to the value, partial fill for fractional part.
 */
export function StarDots({
  metric,
  threshold,
}: {
  metric: Metric
  threshold: ParsedThreshold
}) {
  const value = metric.valueNum ?? 0
  const target = threshold.value ?? 0
  const color = ragColor(metric.rag)

  const fullDots = Math.floor(value)
  const fraction = value - fullDots

  const dotR = 6
  const gap = 8
  const totalW = 5 * (dotR * 2) + 4 * gap
  const svgH = dotR * 2 + 8 // extra space for threshold tick

  return (
    <div className="mt-2 flex justify-center">
      <svg
        viewBox={`0 0 ${totalW} ${svgH}`}
        className="w-full max-w-[140px]"
        aria-hidden="true"
      >
        {Array.from({ length: 5 }, (_, i) => {
          const cx = dotR + i * (dotR * 2 + gap)
          const cy = dotR
          const dotIndex = i + 1
          const isFull = dotIndex <= fullDots
          const isPartial = dotIndex === fullDots + 1 && fraction > 0

          return (
            <g key={i}>
              {/* Background circle */}
              <circle
                cx={cx}
                cy={cy}
                r={dotR}
                fill="currentColor"
                className="text-slate-900/8 dark:text-white/8"
              />

              {/* Filled circle */}
              {isFull && (
                <circle cx={cx} cy={cy} r={dotR} fill={color} />
              )}

              {/* Partial fill using clip */}
              {isPartial && (
                <>
                  <defs>
                    <clipPath id={`partial-${metric.id}`}>
                      <rect
                        x={cx - dotR}
                        y={cy - dotR}
                        width={dotR * 2 * fraction}
                        height={dotR * 2}
                      />
                    </clipPath>
                  </defs>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={dotR}
                    fill={color}
                    clipPath={`url(#partial-${metric.id})`}
                  />
                </>
              )}
            </g>
          )
        })}

        {/* Threshold tick below the dots */}
        {target > 0 && target <= 5 && (() => {
          const tickX = dotR + (target - 1) * (dotR * 2 + gap)
          return (
            <line
              x1={tickX}
              y1={dotR * 2 + 2}
              x2={tickX}
              y2={dotR * 2 + 6}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="text-slate-500 dark:text-slate-400"
            />
          )
        })()}
      </svg>
    </div>
  )
}
