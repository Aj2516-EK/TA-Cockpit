import { describe, it, expect } from 'vitest'
import { parseThreshold, gapToTargetText, ragLabel, meaningForMetric } from './metricExplain'
import type { Metric } from './types'

function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 'metric.test.foo',
    title: 'Test Metric',
    valueText: '50%',
    valueNum: 50,
    thresholdText: '> 70%',
    rag: 'red',
    icon: 'icon',
    alarm: '',
    insight: '',
    action: '',
    ...overrides,
  }
}

describe('parseThreshold', () => {
  it('parses "> 70%" correctly', () => {
    const t = parseThreshold('> 70%')
    expect(t.comparator).toBe('>')
    expect(t.value).toBe(70)
  })

  it('parses "< 7.0 days" correctly', () => {
    const t = parseThreshold('< 7.0 days')
    expect(t.comparator).toBe('<')
    expect(t.value).toBe(7.0)
  })

  it('parses "< AED 14,700" correctly', () => {
    const t = parseThreshold('< AED 14,700')
    expect(t.comparator).toBe('<')
    expect(t.value).toBe(14700)
  })

  it('parses "> 5.0" correctly', () => {
    const t = parseThreshold('> 5.0')
    expect(t.comparator).toBe('>')
    expect(t.value).toBe(5.0)
  })

  it('returns null comparator for non-matching text', () => {
    const t = parseThreshold('Target 1 : 4')
    expect(t.comparator).toBeNull()
    expect(t.value).toBeNull()
  })

  it('returns null for empty string', () => {
    const t = parseThreshold('')
    expect(t.comparator).toBeNull()
  })
})

describe('gapToTargetText', () => {
  it('returns "Above target" when value exceeds ">" threshold', () => {
    const result = gapToTargetText(metric({ valueNum: 80, thresholdText: '> 70%' }))
    expect(result).toContain('Above target')
  })

  it('returns "Below target" when value is below ">" threshold', () => {
    const result = gapToTargetText(metric({ valueNum: 50, thresholdText: '> 70%' }))
    expect(result).toContain('Below target')
    expect(result).toContain('%') // includes percentage
  })

  it('returns "Better than target" when value is below "<" threshold', () => {
    const result = gapToTargetText(metric({ valueNum: 5.0, thresholdText: '< 7.0 days' }))
    expect(result).toContain('Better than target')
  })

  it('returns "Over target" when value exceeds "<" threshold', () => {
    const result = gapToTargetText(metric({ valueNum: 10.0, thresholdText: '< 7.0 days' }))
    expect(result).toContain('Over target')
  })

  it('returns null when valueNum is undefined', () => {
    expect(gapToTargetText(metric({ valueNum: undefined }))).toBeNull()
  })

  it('returns null when threshold is unparseable', () => {
    expect(gapToTargetText(metric({ thresholdText: 'Target 1 : 4' }))).toBeNull()
  })
})

describe('ragLabel', () => {
  it('maps red to Critical', () => {
    expect(ragLabel('red')).toBe('Critical')
  })

  it('maps amber to Watch', () => {
    expect(ragLabel('amber')).toBe('Watch')
  })

  it('maps green to Healthy', () => {
    expect(ragLabel('green')).toBe('Healthy')
  })
})

describe('meaningForMetric', () => {
  it('returns specific meaning for known metric IDs', () => {
    const result = meaningForMetric('metric.readiness.skill_readiness')
    expect(result.meaning).toContain('ready')
    expect(result.formula).toContain('Skill Criteria')
  })

  it('returns generic meaning for unknown metric IDs', () => {
    const result = meaningForMetric('metric.unknown.foo')
    expect(result.meaning).toContain('KPI tile')
    expect(result.formula).toContain('supporting facts')
  })

  it('has entries for all implemented metric IDs', () => {
    const implementedIds = [
      'metric.readiness.qualified_candidates_availability',
      'metric.readiness.skill_readiness',
      'metric.readiness.external_connections',
      'metric.readiness.time_to_present',
      'metric.readiness.critical_skill_capability',
      'metric.readiness.pool_variety',
      'metric.momentum.time_to_next_step',
      'metric.momentum.time_to_cv_response',
      'metric.momentum.time_spent_matching',
      'metric.momentum.recruiting_experience_rating',
      'metric.experience.incomplete_applications',
      'metric.experience.time_to_apply',
      'metric.experience.ease_of_applying',
      'metric.diversity.diverse_attraction',
      'metric.diversity.diverse_pipeline',
      'metric.diversity.active_applicants',
      'metric.economics.cost_per_acquisition',
      'metric.economics.presented_vs_offers',
      'metric.economics.job_posting_effectiveness',
      'metric.economics.hires_from_competitors',
      'metric.economics.hm_feedback_time',
      'metric.economics.jd_criteria_match',
      'metric.economics.interviewed_vs_offered',
    ]
    for (const id of implementedIds) {
      const result = meaningForMetric(id)
      // Should NOT be the generic fallback
      expect(result.meaning).not.toContain('KPI tile')
    }
  })
})
