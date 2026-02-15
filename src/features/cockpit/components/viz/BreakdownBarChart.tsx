import type { DimensionBreakdown } from '../../runtime-data/breakdowns'
import { ragColor } from './vizUtils'

const BAR_HEIGHT = 20
const BAR_GAP = 10
const MIN_BAR_PX = 3

/**
 * SVG horizontal bar chart for a single dimension breakdown.
 *
 * Each chart is wrapped in its own card with a clear title,
 * labels on the left, proportional bars in the center, and
 * value text on the right. A dashed reference line marks the
 * overall metric value.
 */
export function BreakdownBarChart({ breakdown }: { breakdown: DimensionBreakdown }) {
  const { bars, overallValueNum, dimensionLabel } = breakdown

  const maxValue = Math.max(...bars.map((b) => b.valueNum), overallValueNum, 0.001)
  const chartHeight = bars.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP
  const svgHeight = chartHeight + 4

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      {/* Chart title */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          By {dimensionLabel}
        </span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      {/* Chart body */}
      <div className="flex items-start gap-3">
        {/* Left labels */}
        <div className="shrink-0 flex flex-col" style={{ width: 110, gap: BAR_GAP }}>
          {bars.map((bar) => (
            <div
              key={bar.dimensionValue}
              className="truncate text-right text-[11px] font-medium text-slate-300"
              style={{ height: BAR_HEIGHT, lineHeight: `${BAR_HEIGHT}px` }}
              title={bar.dimensionValue}
            >
              {bar.dimensionValue}
            </div>
          ))}
        </div>

        {/* SVG bars */}
        <div className="min-w-0 flex-1">
          <svg
            width="100%"
            height={svgHeight}
            viewBox={`0 0 100 ${svgHeight}`}
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            {bars.map((bar, i) => {
              const y = i * (BAR_HEIGHT + BAR_GAP)
              const widthPct = Math.max((bar.valueNum / maxValue) * 100, MIN_BAR_PX)
              const color = ragColor(bar.rag)

              return (
                <g key={bar.dimensionValue}>
                  {/* Track */}
                  <rect
                    x={0} y={y} width={100} height={BAR_HEIGHT}
                    rx={5}
                    className="fill-white/[0.04]"
                  />
                  {/* Fill */}
                  <rect
                    x={0} y={y} width={widthPct} height={BAR_HEIGHT}
                    rx={5} fill={color} opacity={0.8}
                  >
                    <animate
                      attributeName="width"
                      from="0" to={widthPct}
                      dur="0.5s" fill="freeze"
                    />
                  </rect>
                </g>
              )
            })}

            {/* Reference line */}
            {overallValueNum > 0 && (
              <line
                x1={(overallValueNum / maxValue) * 100}
                y1={-4}
                x2={(overallValueNum / maxValue) * 100}
                y2={svgHeight + 4}
                stroke="currentColor"
                strokeWidth={0.8}
                strokeDasharray="3,3"
                className="text-slate-400 dark:text-slate-500"
              />
            )}
          </svg>
        </div>

        {/* Right values + sample size */}
        <div className="shrink-0 flex flex-col items-end" style={{ width: 90, gap: BAR_GAP }}>
          {bars.map((bar) => (
            <div
              key={bar.dimensionValue}
              className="flex items-center gap-1.5 tabular-nums"
              style={{ height: BAR_HEIGHT, lineHeight: `${BAR_HEIGHT}px` }}
            >
              <span
                className="text-[11px] font-bold"
                style={{ color: ragColor(bar.rag) }}
              >
                {bar.valueText}
              </span>
              <span className="text-[9px] text-slate-500">
                n={bar.rowCount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span className="inline-block h-px w-4 border-t border-dashed border-slate-400" />
        <span>Overall: {overallValueNum.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
      </div>
    </div>
  )
}
