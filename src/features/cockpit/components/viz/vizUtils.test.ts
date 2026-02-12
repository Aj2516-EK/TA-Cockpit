import { describe, it, expect } from 'vitest'
import { getVizCategory, ragColor } from './vizUtils'

describe('getVizCategory', () => {
  it('returns "percentage" for skill_readiness', () => {
    expect(getVizCategory('metric.readiness.skill_readiness')).toBe('percentage')
  })

  it('returns "time" for time_to_next_step', () => {
    expect(getVizCategory('metric.momentum.time_to_next_step')).toBe('time')
  })

  it('returns "count" for active_applicants', () => {
    expect(getVizCategory('metric.diversity.active_applicants')).toBe('count')
  })

  it('returns "rating" for ease_of_applying', () => {
    expect(getVizCategory('metric.experience.ease_of_applying')).toBe('rating')
  })

  it('returns "cost" for cost_per_acquisition', () => {
    expect(getVizCategory('metric.economics.cost_per_acquisition')).toBe('cost')
  })

  it('returns "ratio" for interviewed_vs_offered', () => {
    expect(getVizCategory('metric.economics.interviewed_vs_offered')).toBe('ratio')
  })

  it('returns null for unknown metric ID', () => {
    expect(getVizCategory('metric.unknown.foo')).toBeNull()
  })

  it('extracts short name from dotted metric ID', () => {
    // Even with extra dots, it takes the last segment
    expect(getVizCategory('some.prefix.skill_readiness')).toBe('percentage')
  })
})

describe('ragColor', () => {
  it('returns red hex for red', () => {
    expect(ragColor('red')).toBe('#ef4444')
  })

  it('returns amber hex for amber', () => {
    expect(ragColor('amber')).toBe('#f59e0b')
  })

  it('returns green hex for green', () => {
    expect(ragColor('green')).toBe('#22c55e')
  })
})
