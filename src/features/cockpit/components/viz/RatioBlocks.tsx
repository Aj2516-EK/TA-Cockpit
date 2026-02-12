import type { Metric } from '../../model'
import type { ParsedThreshold } from '../../model/metricExplain'
import { ragColor } from './vizUtils'

/**
 * Block-segment ratio display for interview-to-offer ratio.
 * Shows N interview blocks : 1 offer block.
 */
export function RatioBlocks({
  metric,
  threshold,
}: {
  metric: Metric
  threshold: ParsedThreshold
}) {
  const value = metric.valueNum ?? 0
  const target = threshold.value ?? 4
  const color = ragColor(metric.rag)

  // value is ratio like 3.2 (interviews per offer)
  const fullBlocks = Math.floor(value)
  const fraction = value - fullBlocks
  const totalBlocks = Math.max(fullBlocks + (fraction > 0 ? 1 : 0), 1)

  const blockW = 14
  const blockH = 14
  const gap = 4
  const offerBlockW = 14
  const separatorW = 8

  const totalW =
    totalBlocks * blockW +
    (totalBlocks - 1) * gap +
    separatorW +
    offerBlockW

  return (
    <div className="mt-2 flex items-center justify-center gap-1">
      <svg
        viewBox={`0 0 ${totalW} ${blockH}`}
        className="w-full max-w-[160px]"
        aria-hidden="true"
      >
        {/* Interview blocks */}
        {Array.from({ length: totalBlocks }, (_, i) => {
          const x = i * (blockW + gap)
          const isPartial = i === totalBlocks - 1 && fraction > 0
          const w = isPartial ? blockW * fraction : blockW

          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={w}
              height={blockH}
              rx={3}
              fill={color}
              opacity={isPartial ? 0.5 : 1}
            />
          )
        })}

        {/* Separator colon */}
        <text
          x={totalBlocks * (blockW + gap) - gap + separatorW / 2}
          y={blockH / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight={700}
          className="fill-slate-400 dark:fill-slate-500"
        >
          :
        </text>

        {/* Offer block */}
        <rect
          x={totalBlocks * (blockW + gap) - gap + separatorW}
          y={0}
          width={offerBlockW}
          height={blockH}
          rx={3}
          className="fill-slate-900/15 dark:fill-white/15"
        />
      </svg>

      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
        {value.toFixed(1)}:1
      </span>
    </div>
  )
}
