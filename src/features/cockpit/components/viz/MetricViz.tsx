import type { Metric } from '../../model'
import { parseThreshold } from '../../model/metricExplain'
import type { TrendPoint } from '../../runtime-data/trends'
import { getVizCategory } from './vizUtils'
import { GaugeArc } from './GaugeArc'
import { BulletBar } from './BulletBar'
import { ProgressBar } from './ProgressBar'
import { StarDots } from './StarDots'
import { RatioBlocks } from './RatioBlocks'
import { Sparkline } from './Sparkline'
import { getVizInterpretation, getSparklineInterpretation } from './vizInterpretation'

/**
 * Renders the appropriate inline visualization for a metric
 * based on its category (percentage, time, count, rating, cost, ratio),
 * plus a sparkline trend if data is available, with interpretation text.
 */
export function MetricViz({
  metric,
  trend,
}: {
  metric: Metric
  trend?: TrendPoint[]
}) {
  if (typeof metric.valueNum !== 'number') return null

  const category = getVizCategory(metric.id)
  if (!category) return null

  const threshold = parseThreshold(metric.thresholdText)

  let gauge: React.ReactNode = null
  switch (category) {
    case 'percentage':
      gauge = <GaugeArc metric={metric} threshold={threshold} />
      break
    case 'time':
      gauge = <BulletBar metric={metric} threshold={threshold} />
      break
    case 'count':
      gauge = <ProgressBar metric={metric} threshold={threshold} />
      break
    case 'rating':
      gauge = <StarDots metric={metric} threshold={threshold} />
      break
    case 'cost':
      gauge = <BulletBar metric={metric} threshold={threshold} />
      break
    case 'ratio':
      gauge = <RatioBlocks metric={metric} />
      break
  }

  const gaugeInterpretation = getVizInterpretation(metric)

  // Calculate sparkline interpretation if available
  let sparklineInterpretation = ''
  if (trend && trend.length >= 2) {
    const first = trend[0].value
    const last = trend[trend.length - 1].value
    const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0
    sparklineInterpretation = getSparklineInterpretation(trend.length, pctChange)
  }

  return (
    <div className="space-y-3">
      {gauge}

      {trend && trend.length >= 2 && (
        <Sparkline
          points={trend}
          rag={metric.rag}
          thresholdValue={threshold.value}
        />
      )}

      {/* Interpretation text */}
      <div className="space-y-1.5 rounded-xl bg-slate-900/3 px-3 py-2 dark:bg-white/3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          How to read this
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          {gaugeInterpretation}
        </p>
        {sparklineInterpretation && (
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {sparklineInterpretation}
          </p>
        )}
      </div>
    </div>
  )
}
