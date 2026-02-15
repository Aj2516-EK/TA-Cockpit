import { describe, it, expect } from 'vitest'
import { computeMetric, IMPLEMENTED_METRIC_IDS, computeMetricsByCluster } from './runtimeMetrics'
import type { ApplicationFactRow } from '../runtime-data/types'

/** Minimal valid row with overrides. */
function row(overrides: Partial<ApplicationFactRow> = {}): ApplicationFactRow {
  return {
    applicationId: 'A1',
    candidateId: 'C1',
    requisitionId: 'R1',
    applicationDate: null,
    currentStage: null,
    stageEnterDate: null,
    stageExitDate: null,
    status: null,
    cvSubmissionTimeHours: null,
    recruiterResponseTimeHours: null,
    source: null,
    candidateType: null,
    diversityFlag: null,
    isCompetitor: null,
    applicationStartTime: null,
    applicationSubmitTime: null,
    applicationCompleted: null,
    applicationEaseRating: null,
    candidateNps: null,
    skillMatchPercentage: null,
    primarySkills: null,
    skillsetCategory: null,
    secondarySkills: null,
    skillProficiencyLevel: null,
    transferrableSkillset: null,
    transferableSkillMatchPct: null,
    futureReadinessScore: null,
    availabilityWindow: null,
    benchStrengthTag: null,
    mobilityPreference: null,
    upskillingInterest: null,
    roleName: null,
    businessUnit: null,
    location: null,
    criticalSkillFlag: null,
    requisitionOpenDate: null,
    requisitionCloseDate: null,
    budgetedCost: null,
    skillsRequired: null,
    hiringManagerId: null,
    recruiterId: null,
    matchingHoursTotal: null,
    interviewDate: null,
    feedbackDate: null,
    offerDate: null,
    offerMade: null,
    offerAccepted: null,
    totalHiringCost: null,
    advertisingCost: null,
    agencyFee: null,
    technologyCost: null,
    recruiterCost: null,
    jobViews: null,
    jobApplicationsReceived: null,
    ...overrides,
  }
}

describe('computeMetric', () => {
  it('returns null for unknown metric IDs', () => {
    expect(computeMetric('metric.unknown.foo', [row()])).toBeNull()
  })

  it('returns null for empty rows on most metrics', () => {
    expect(computeMetric('metric.readiness.skill_readiness', [])).toBeNull()
  })

  describe('skill_readiness', () => {
    it('computes average skill match % across unique candidates', () => {
      const rows = [
        row({ candidateId: 'C1', skillMatchPercentage: 80 }),
        row({ candidateId: 'C2', skillMatchPercentage: 60 }),
      ]
      const result = computeMetric('metric.readiness.skill_readiness', rows)!
      expect(result.valueNum).toBe(70)
      expect(result.rag).toBe('green') // 70 >= greenMin of 70
    })

    it('deduplicates by candidateId', () => {
      const rows = [
        row({ candidateId: 'C1', skillMatchPercentage: 80 }),
        row({ candidateId: 'C1', skillMatchPercentage: 90 }), // duplicate, ignored
        row({ candidateId: 'C2', skillMatchPercentage: 60 }),
      ]
      const result = computeMetric('metric.readiness.skill_readiness', rows)!
      // uniqBy keeps first occurrence: C1=80, C2=60 → avg=70
      expect(result.valueNum).toBe(70)
    })

    it('returns amber when below green threshold', () => {
      const rows = [
        row({ candidateId: 'C1', skillMatchPercentage: 68 }),
        row({ candidateId: 'C2', skillMatchPercentage: 66 }),
      ]
      const result = computeMetric('metric.readiness.skill_readiness', rows)!
      expect(result.valueNum).toBe(67)
      expect(result.rag).toBe('amber') // 67 >= amberMin 66 but < greenMin 70
    })

    it('returns red when below amber threshold', () => {
      const rows = [
        row({ candidateId: 'C1', skillMatchPercentage: 50 }),
        row({ candidateId: 'C2', skillMatchPercentage: 60 }),
      ]
      const result = computeMetric('metric.readiness.skill_readiness', rows)!
      expect(result.valueNum).toBe(55)
      expect(result.rag).toBe('red')
    })
  })

  describe('qualified_candidates_availability', () => {
    it('counts qualified candidates (skill >= 80) per critical requisition', () => {
      const rows = [
        row({ requisitionId: 'R1', candidateId: 'C1', criticalSkillFlag: true, skillMatchPercentage: 85 }),
        row({ requisitionId: 'R1', candidateId: 'C2', criticalSkillFlag: true, skillMatchPercentage: 90 }),
        row({ requisitionId: 'R1', candidateId: 'C3', criticalSkillFlag: true, skillMatchPercentage: 70 }), // below 80
      ]
      const result = computeMetric('metric.readiness.qualified_candidates_availability', rows)!
      // R1: 2 qualified (C1, C2) → avg = 2.0
      expect(result.valueNum).toBe(2)
      expect(result.rag).toBe('red') // 2 < amberMin 3.5
    })

    it('returns null when no critical-skill requisitions', () => {
      const rows = [
        row({ requisitionId: 'R1', candidateId: 'C1', criticalSkillFlag: false, skillMatchPercentage: 85 }),
      ]
      expect(computeMetric('metric.readiness.qualified_candidates_availability', rows)).toBeNull()
    })
  })

  describe('time_to_next_step (momentum)', () => {
    it('computes average stage duration in days', () => {
      const rows = [
        row({
          stageEnterDate: new Date('2025-01-01'),
          stageExitDate: new Date('2025-01-04'), // 3 days
        }),
        row({
          stageEnterDate: new Date('2025-01-10'),
          stageExitDate: new Date('2025-01-17'), // 7 days
        }),
      ]
      const result = computeMetric('metric.momentum.time_to_next_step', rows)!
      expect(result.valueNum).toBe(5) // (3+7)/2
      expect(result.rag).toBe('green') // 5 <= greenMax 5.0
    })

    it('ignores rows with negative durations', () => {
      const rows = [
        row({
          stageEnterDate: new Date('2025-01-10'),
          stageExitDate: new Date('2025-01-01'), // negative
        }),
        row({
          stageEnterDate: new Date('2025-01-01'),
          stageExitDate: new Date('2025-01-05'), // 4 days
        }),
      ]
      const result = computeMetric('metric.momentum.time_to_next_step', rows)!
      expect(result.valueNum).toBe(4)
    })
  })

  describe('incomplete_applications (experience)', () => {
    it('computes percentage of incomplete apps', () => {
      const rows = [
        row({ candidateId: 'C1', applicationCompleted: true }),
        row({ candidateId: 'C2', applicationCompleted: true }),
        row({ candidateId: 'C3', applicationCompleted: false }),
        row({ candidateId: 'C4', applicationCompleted: false }),
      ]
      const result = computeMetric('metric.experience.incomplete_applications', rows)!
      expect(result.valueNum).toBe(50) // 2/4 = 50%
      expect(result.rag).toBe('red') // 50 > amberMax 25
    })

    it('returns null when no candidates have completion flag', () => {
      const rows = [row({ candidateId: 'C1', applicationCompleted: null })]
      expect(computeMetric('metric.experience.incomplete_applications', rows)).toBeNull()
    })
  })

  describe('diverse_attraction (diversity)', () => {
    it('computes % of female candidates', () => {
      const rows = [
        row({ candidateId: 'C1', diversityFlag: 'Female' }),
        row({ candidateId: 'C2', diversityFlag: 'Female' }),
        row({ candidateId: 'C3', diversityFlag: 'Male' }),
        row({ candidateId: 'C4', diversityFlag: 'Male' }),
        row({ candidateId: 'C5', diversityFlag: 'Male' }),
      ]
      const result = computeMetric('metric.diversity.diverse_attraction', rows)!
      expect(result.valueNum).toBe(40)
      expect(result.rag).toBe('green') // 40 >= greenMin 40
    })
  })

  describe('cost_per_acquisition (economics)', () => {
    it('computes total cost / number of hires', () => {
      const rows = [
        row({ requisitionId: 'R1', totalHiringCost: 18350, status: 'Hired', applicationId: 'A1' }),
        row({ requisitionId: 'R2', totalHiringCost: 11010, status: 'Hired', applicationId: 'A2' }),
        row({ requisitionId: 'R3', totalHiringCost: 7340, status: 'Active', applicationId: 'A3' }),
      ]
      const result = computeMetric('metric.economics.cost_per_acquisition', rows)!
      // totalCost = 18350+11010+7340 = 36700, hires = 2 → 18350
      expect(result.valueNum).toBe(18350)
      expect(result.rag).toBe('red') // 18350 > amberMax 16500
    })

    it('returns N/A when no hires', () => {
      const rows = [
        row({ requisitionId: 'R1', totalHiringCost: 5000, status: 'Active', applicationId: 'A1' }),
      ]
      const result = computeMetric('metric.economics.cost_per_acquisition', rows)!
      expect(result.valueText).toBe('N/A')
      expect(result.valueNum).toBeUndefined()
    })

    it('returns N/A with no cost data', () => {
      const rows = [
        row({ requisitionId: 'R1', totalHiringCost: null, status: 'Hired', applicationId: 'A1' }),
      ]
      const result = computeMetric('metric.economics.cost_per_acquisition', rows)!
      expect(result.valueText).toBe('N/A')
    })
  })

  describe('interviewed_vs_offered (economics)', () => {
    it('computes the interview-to-offer ratio', () => {
      const rows = [
        row({ candidateId: 'C1', interviewDate: new Date('2025-01-01'), offerMade: true }),
        row({ candidateId: 'C2', interviewDate: new Date('2025-01-02'), offerMade: true }),
        row({ candidateId: 'C3', interviewDate: new Date('2025-01-03'), offerMade: false }),
        row({ candidateId: 'C4', interviewDate: new Date('2025-01-04'), offerMade: false }),
        row({ candidateId: 'C5', interviewDate: new Date('2025-01-05'), offerMade: false }),
        row({ candidateId: 'C6', interviewDate: new Date('2025-01-06'), offerMade: false }),
        row({ candidateId: 'C7', interviewDate: new Date('2025-01-07'), offerMade: false }),
        row({ candidateId: 'C8', interviewDate: new Date('2025-01-08'), offerMade: false }),
      ]
      const result = computeMetric('metric.economics.interviewed_vs_offered', rows)!
      // 8 interviewed / 2 offers = ratio 4
      expect(result.valueNum).toBe(4)
      expect(result.rag).toBe('green') // ratio >= 4
    })

    it('returns null when no offers', () => {
      const rows = [
        row({ candidateId: 'C1', interviewDate: new Date('2025-01-01'), offerMade: false }),
      ]
      expect(computeMetric('metric.economics.interviewed_vs_offered', rows)).toBeNull()
    })
  })
})

describe('IMPLEMENTED_METRIC_IDS', () => {
  it('contains 23 metric IDs', () => {
    expect(IMPLEMENTED_METRIC_IDS.size).toBe(23)
  })

  it('all IDs follow naming convention', () => {
    for (const id of IMPLEMENTED_METRIC_IDS) {
      expect(id).toMatch(/^metric\.(readiness|momentum|experience|diversity|economics)\./)
    }
  })
})

describe('computeMetricsByCluster', () => {
  it('returns all 5 clusters with metrics when no rows provided', () => {
    const result = computeMetricsByCluster({ rows: null })
    const clusterIds = Object.keys(result)
    expect(clusterIds).toContain('readiness')
    expect(clusterIds).toContain('momentum')
    expect(clusterIds).toContain('experience')
    expect(clusterIds).toContain('diversity')
    expect(clusterIds).toContain('economics')
  })

  it('sets valueText to "--" when no rows', () => {
    const result = computeMetricsByCluster({ rows: null })
    for (const cluster of Object.values(result)) {
      for (const metric of cluster) {
        expect(metric.valueText).toBe('--')
      }
    }
  })

  it('sets valueText to "N/A" for implemented metrics with insufficient data', () => {
    const result = computeMetricsByCluster({ rows: [] })
    // All metrics should be N/A since there's no data
    for (const cluster of Object.values(result)) {
      for (const metric of cluster) {
        expect(metric.valueText).toBe('N/A')
      }
    }
  })
})
