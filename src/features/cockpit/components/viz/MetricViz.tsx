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

/**
 * Renders the appropriate inline visualization for a metric
 * based on its category (percentage, time, count, rating, cost, ratio),
 * plus a sparkline trend if data is available.
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
      gauge = <RatioBlocks metric={metric} threshold={threshold} />
      break
  }

  return (
    <div>
      {gauge}
      {trend && trend.length >= 2 && (
        <Sparkline
          points={trend}
          rag={metric.rag}
          thresholdValue={threshold.value}
        />
      )}
    </div>
  )
}
