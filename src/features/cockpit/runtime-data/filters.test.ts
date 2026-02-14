import { describe, it, expect } from 'vitest'
import { deriveFilterOptions, applyFilters, resetFilters } from './filters'
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
    roleName: null,
    businessUnit: null,
    location: null,
    criticalSkillFlag: null,
    requisitionOpenDate: null,
    requisitionCloseDate: null,
    budgetedCost: null,
    recruiterId: null,
    matchingHoursTotal: null,
    interviewDate: null,
    feedbackDate: null,
    offerDate: null,
    offerMade: null,
    offerAccepted: null,
    totalHiringCost: null,
    jobViews: null,
    jobApplicationsReceived: null,
    ...overrides,
  }
}

describe('deriveFilterOptions', () => {
  it('returns empty arrays for null rows', () => {
    const opts = deriveFilterOptions(null)
    expect(opts.businessUnit).toEqual([])
    expect(opts.location).toEqual([])
    expect(opts.status).toEqual([])
  })

  it('extracts unique sorted business units', () => {
    const rows = [
      row({ businessUnit: 'Engineering' }),
      row({ businessUnit: 'Sales' }),
      row({ businessUnit: 'Engineering' }), // duplicate
      row({ businessUnit: null }),
    ]
    const opts = deriveFilterOptions(rows)
    expect(opts.businessUnit).toEqual(['Engineering', 'Sales'])
  })

  it('extracts Male/Female for diversity flag', () => {
    const rows = [
      row({ diversityFlag: 'Female' }),
      row({ diversityFlag: 'Male' }),
      row({ diversityFlag: null }),
    ]
    const opts = deriveFilterOptions(rows)
    expect(opts.diversityFlag).toEqual(['Female', 'Male']) // sorted
  })

  it('extracts Internal/External for candidateType', () => {
    const rows = [
      row({ candidateType: 'External' }),
      row({ candidateType: 'Internal' }),
      row({ candidateType: null }),
    ]
    const opts = deriveFilterOptions(rows)
    expect(opts.candidateType).toEqual(['External', 'Internal'])
  })

  it('filters status to only Active/Rejected/Hired', () => {
    const rows = [
      row({ status: 'Active' }),
      row({ status: 'Hired' }),
      row({ status: 'Rejected' }),
    ]
    const opts = deriveFilterOptions(rows)
    expect(opts.status).toEqual(['Active', 'Hired', 'Rejected'])
  })
})

describe('applyFilters', () => {
  const baseRows = [
    row({ applicationDate: new Date('2025-03-01'), businessUnit: 'Engineering', location: 'NYC', status: 'Active', candidateType: 'Internal', diversityFlag: 'Female', criticalSkillFlag: true }),
    row({ applicationDate: new Date('2025-03-15'), businessUnit: 'Sales', location: 'LA', status: 'Hired', candidateType: 'External', diversityFlag: 'Male', criticalSkillFlag: false }),
    row({ applicationDate: new Date('2025-04-01'), businessUnit: 'Engineering', location: 'NYC', status: 'Rejected', candidateType: 'External', diversityFlag: 'Female', criticalSkillFlag: true }),
  ]

  it('returns all rows with empty filters', () => {
    expect(applyFilters(baseRows, {})).toHaveLength(3)
  })

  it('filters by businessUnit', () => {
    const filtered = applyFilters(baseRows, { businessUnit: ['Engineering'] })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((r) => r.businessUnit === 'Engineering')).toBe(true)
  })

  it('filters by location', () => {
    const filtered = applyFilters(baseRows, { location: ['LA'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].location).toBe('LA')
  })

  it('filters by date range', () => {
    const filtered = applyFilters(baseRows, {
      dateFrom: '2025-03-10',
      dateTo: '2025-03-20',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].businessUnit).toBe('Sales')
  })

  it('excludes rows with no applicationDate when date filter is active', () => {
    const rows = [
      row({ applicationDate: null, businessUnit: 'X' }),
      row({ applicationDate: new Date('2025-03-15'), businessUnit: 'Y' }),
    ]
    const filtered = applyFilters(rows, { dateFrom: '2025-01-01' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].businessUnit).toBe('Y')
  })

  it('filters by status', () => {
    const filtered = applyFilters(baseRows, { status: ['Hired', 'Active'] })
    expect(filtered).toHaveLength(2)
  })

  it('filters by candidateType', () => {
    const filtered = applyFilters(baseRows, { candidateType: ['External'] })
    expect(filtered).toHaveLength(2)
  })

  it('filters by diversityFlag Male/Female', () => {
    const filtered = applyFilters(baseRows, { diversityFlag: ['Female'] })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((r) => r.diversityFlag === 'Female')).toBe(true)
  })

  it('filters by criticalSkillFlag', () => {
    const filtered = applyFilters(baseRows, { criticalSkillFlag: ['Y'] })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((r) => r.criticalSkillFlag === true)).toBe(true)
  })

  it('combines multiple filters', () => {
    const filtered = applyFilters(baseRows, {
      businessUnit: ['Engineering'],
      status: ['Active'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].status).toBe('Active')
    expect(filtered[0].businessUnit).toBe('Engineering')
  })
})

describe('resetFilters', () => {
  it('returns an empty object', () => {
    expect(resetFilters()).toEqual({})
  })
})
