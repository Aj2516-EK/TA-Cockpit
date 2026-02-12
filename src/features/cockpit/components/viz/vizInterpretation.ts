import { parseThreshold } from '../../model/metricExplain'
import type { Metric } from '../../model'
import type { VizCategory } from './vizUtils'
import { getVizCategory } from './vizUtils'

/**
 * Generate human-readable interpretation text for a metric's visualization.
 * Explains what the chart shows and how to read it.
 */
export function getVizInterpretation(metric: Metric): string {
  const category = getVizCategory(metric.id)
  const threshold = parseThreshold(metric.thresholdText)
  const lowerIsBetter = threshold.comparator === '<'

  switch (category) {
    case 'percentage': {
      const gauge = `The gauge arc shows the current percentage (${metric.valueText}) against the 0–100% range.`
      const target = threshold.value
        ? ` The threshold line marks the ${threshold.value}% target.`
        : ''
      const direction = lowerIsBetter
        ? ' Lower percentages are better for this metric.'
        : ' Higher percentages are better for this metric.'
      return gauge + target + direction
    }

    case 'time': {
      const bar = `The horizontal bar shows the current duration (${metric.valueText}).`
      const target = threshold.value
        ? ` The vertical line marks the ${threshold.value}${metric.unit?.includes('hr') ? ' hour' : ' day'} target.`
        : ''
      const direction = ' Shorter times indicate better performance.'
      return bar + target + direction
    }

    case 'cost': {
      const bar = `The horizontal bar shows the current cost (${metric.valueText}).`
      const target = threshold.value
        ? ` The vertical line marks the ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(threshold.value)} target.`
        : ''
      const direction = ' Lower costs indicate better efficiency.'
      return bar + target + direction
    }

    case 'count': {
      const bar = `The progress bar shows the current count (${metric.valueText}).`
      const target = threshold.value
        ? ` The vertical line marks the ${threshold.value.toLocaleString()} target.`
        : ''
      const direction = ' Higher counts indicate better performance.'
      return bar + target + direction
    }

    case 'rating': {
      const dots = `The five dots represent the 1-5 rating scale, with filled dots showing the current rating (${metric.valueText}).`
      const target = threshold.value
        ? ` The threshold line marks the ${threshold.value} target.`
        : ''
      const direction = ' Higher ratings are better.'
      return dots + target + direction
    }

    case 'ratio': {
      const blocks = `The blocks show the interview-to-offer ratio (${metric.valueText}).`
      const direction = ' A higher ratio means more interviews per offer (lower conversion).'
      return blocks + direction
    }

    default:
      return 'Visual representation of the metric value against its target threshold.'
  }
}

/**
 * Generate interpretation text specifically for the sparkline trend.
 */
export function getSparklineInterpretation(weekCount: number, pctChange: number): string {
  const weeks = `${weekCount}-week trend`
  const direction = pctChange > 0 ? 'increasing' : pctChange < 0 ? 'decreasing' : 'stable'
  const change = pctChange !== 0 ? ` (${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}% change)` : ''

  return `${weeks} showing ${direction} performance${change}. The dashed line marks the target threshold.`
}
