import { describe, it, expect } from 'vitest'
import { computeStageDistribution, computeWeeklyTrend } from './charts'
import type { ApplicationFactRow } from './types'

function row(overrides: Partial<ApplicationFactRow> = {}): ApplicationFactRow {
  return {
    applicationId: null,
    candidateId: null,
    requisitionId: null,
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

describe('computeStageDistribution', () => {
  it('counts unique applications per stage', () => {
    const rows = [
      row({ applicationId: 'A1', currentStage: 'Applied' }),
      row({ applicationId: 'A2', currentStage: 'Applied' }),
      row({ applicationId: 'A3', currentStage: 'Interview' }),
    ]
    const result = computeStageDistribution(rows)
    const applied = result.points.find((p) => p.stage === 'Applied')
    const interview = result.points.find((p) => p.stage === 'Interview')
    expect(applied?.applications).toBe(2)
    expect(interview?.applications).toBe(1)
  })

  it('deduplicates by applicationId', () => {
    const rows = [
      row({ applicationId: 'A1', currentStage: 'Applied' }),
      row({ applicationId: 'A1', currentStage: 'Applied' }), // duplicate
    ]
    const result = computeStageDistribution(rows)
    expect(result.points[0].applications).toBe(1)
  })

  it('sorts stages in funnel order', () => {
    const rows = [
      row({ applicationId: 'A1', currentStage: 'Interview' }),
      row({ applicationId: 'A2', currentStage: 'Applied' }),
      row({ applicationId: 'A3', currentStage: 'Offer' }),
      row({ applicationId: 'A4', currentStage: 'Screen' }),
    ]
    const result = computeStageDistribution(rows)
    const stages = result.points.map((p) => p.stage)
    expect(stages).toEqual(['Applied', 'Screen', 'Interview', 'Offer'])
  })

  it('handles empty rows', () => {
    const result = computeStageDistribution([])
    expect(result.points).toEqual([])
    expect(result.totalApplications).toBe(0)
  })

  it('groups rows without applicationId as missing', () => {
    const rows = [
      row({ applicationId: null, currentStage: 'Applied' }),
      row({ applicationId: 'A1', currentStage: 'Applied' }),
    ]
    const result = computeStageDistribution(rows)
    expect(result.missingApplicationIdRows).toBe(1)
  })
})

describe('computeWeeklyTrend', () => {
  it('groups applications by ISO week', () => {
    // Use local-time constructors to avoid UTC-vs-local timezone shifts
    const rows = [
      row({ applicationId: 'A1', applicationDate: new Date(2025, 0, 6), status: 'Active' }),  // Mon Jan 6
      row({ applicationId: 'A2', applicationDate: new Date(2025, 0, 7), status: 'Active' }),  // Tue Jan 7 (same week)
      row({ applicationId: 'A3', applicationDate: new Date(2025, 0, 13), status: 'Active' }), // Mon Jan 13 (next week)
    ]
    const result = computeWeeklyTrend(rows)
    expect(result.points.length).toBe(2)
    // First week should have 2 apps
    expect(result.points[0].applications).toBe(2)
    expect(result.points[1].applications).toBe(1)
  })

  it('counts hires per week', () => {
    const rows = [
      row({ applicationId: 'A1', applicationDate: new Date('2025-01-06'), status: 'Hired' }),
      row({ applicationId: 'A2', applicationDate: new Date('2025-01-07'), status: 'Active' }),
    ]
    const result = computeWeeklyTrend(rows)
    expect(result.points[0].hires).toBe(1)
  })

  it('tracks missing date count', () => {
    const rows = [
      row({ applicationId: 'A1', applicationDate: null }),
      row({ applicationId: 'A2', applicationDate: new Date('2025-01-06') }),
    ]
    const result = computeWeeklyTrend(rows)
    expect(result.missingDates).toBe(1)
  })

  it('sorts weeks chronologically', () => {
    const rows = [
      row({ applicationId: 'A1', applicationDate: new Date('2025-03-10') }),
      row({ applicationId: 'A2', applicationDate: new Date('2025-01-06') }),
      row({ applicationId: 'A3', applicationDate: new Date('2025-02-10') }),
    ]
    const result = computeWeeklyTrend(rows)
    const weeks = result.points.map((p) => p.weekStart)
    expect(weeks).toEqual([...weeks].sort())
  })

  it('handles empty rows', () => {
    const result = computeWeeklyTrend([])
    expect(result.points).toEqual([])
    expect(result.missingDates).toBe(0)
  })
})
