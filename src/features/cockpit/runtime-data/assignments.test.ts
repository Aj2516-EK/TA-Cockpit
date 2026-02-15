import { describe, it, expect, beforeEach } from 'vitest'
import { loadAssignments, saveAssignments, transitionStatus, type MetricAssignment } from './assignments'

// Mock localStorage
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
  get length() { return Object.keys(store).length },
  key: (i: number) => {
    void i
    return null as string | null
  },
}

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true })

beforeEach(() => {
  mockLocalStorage.clear()
})

describe('loadAssignments', () => {
  it('returns empty object when localStorage is empty', () => {
    expect(loadAssignments()).toEqual({})
  })

  it('migrates v1 records (adds status: assigned, resolvedAt: null)', () => {
    const v1Data = {
      'metric.readiness.skill_readiness': {
        owner: 'John',
        note: 'Fix this',
        targetDate: '2026-03-01',
        assignedAt: '2026-02-14T10:00:00Z',
      },
    }
    store['ta_metric_assignments'] = JSON.stringify(v1Data)

    const result = loadAssignments()
    expect(result['metric.readiness.skill_readiness']).toEqual({
      owner: 'John',
      note: 'Fix this',
      targetDate: '2026-03-01',
      assignedAt: '2026-02-14T10:00:00Z',
      status: 'assigned',
      resolvedAt: null,
    })
  })

  it('loads v2 records correctly', () => {
    const v2Data = {
      _schemaVersion: 2,
      data: {
        'm1': {
          owner: 'Jina',
          note: '',
          targetDate: '',
          assignedAt: '2026-02-14T10:00:00Z',
          status: 'in_progress',
          resolvedAt: null,
        },
      },
    }
    store['ta_metric_assignments'] = JSON.stringify(v2Data)

    const result = loadAssignments()
    expect(result['m1']?.status).toBe('in_progress')
  })
})

describe('transitionStatus', () => {
  const base: MetricAssignment = {
    owner: 'John',
    note: 'test',
    targetDate: '2026-03-01',
    assignedAt: '2026-02-14T10:00:00Z',
    status: 'assigned',
    resolvedAt: null,
  }

  it('assigned → in_progress', () => {
    const result = transitionStatus(base, 'in_progress')
    expect(result.status).toBe('in_progress')
    expect(result.resolvedAt).toBeNull()
  })

  it('in_progress → resolved sets resolvedAt', () => {
    const inProgress = { ...base, status: 'in_progress' as const }
    const result = transitionStatus(inProgress, 'resolved')
    expect(result.status).toBe('resolved')
    expect(result.resolvedAt).toBeTruthy()
    expect(new Date(result.resolvedAt!).getTime()).toBeGreaterThan(0)
  })

  it('resolved → assigned clears resolvedAt', () => {
    const resolved = { ...base, status: 'resolved' as const, resolvedAt: '2026-02-14T12:00:00Z' }
    const result = transitionStatus(resolved, 'assigned')
    expect(result.status).toBe('assigned')
    expect(result.resolvedAt).toBeNull()
  })

  it('invalid transition is a no-op', () => {
    const result = transitionStatus(base, 'resolved')
    expect(result).toBe(base) // Same reference — unchanged
  })
})

describe('round-trip persistence', () => {
  it('saveAssignments → loadAssignments preserves data', () => {
    const data = {
      'm1': {
        owner: 'Jack',
        note: 'Check weekly',
        targetDate: '2026-04-01',
        assignedAt: '2026-02-14T10:00:00Z',
        status: 'in_progress' as const,
        resolvedAt: null,
      },
    }
    saveAssignments(data)
    const loaded = loadAssignments()
    expect(loaded).toEqual(data)
  })
})
