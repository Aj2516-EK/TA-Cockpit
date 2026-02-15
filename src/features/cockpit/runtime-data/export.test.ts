import { describe, it, expect } from 'vitest'
import Papa from 'papaparse'
import type { Metric, ClusterId } from '../model'
import type { TrendPoint } from './trends'
import { summarizeTrend, buildExportRows, exportMetricsToCsv, exportMetricsToXlsx } from './export'

function makeTrend(values: number[]): TrendPoint[] {
  return values.map((v, i) => ({ week: `2026-W${String(i + 1).padStart(2, '0')}`, value: v }))
}

function makeMetric(overrides: Partial<Metric> & { id: string; title: string }): Metric {
  return {
    valueText: '10',
    thresholdText: '> 8',
    rag: 'green',
    icon: 'check',
    alarm: 'On target',
    insight: 'Looks good',
    action: 'Maintain',
    ...overrides,
  }
}

describe('summarizeTrend', () => {
  it('returns "no data" for empty array', () => {
    expect(summarizeTrend([])).toBe('no data')
  })

  it('returns "insufficient data" for < 6 points', () => {
    expect(summarizeTrend(makeTrend([1, 2, 3]))).toBe('insufficient data')
  })

  it('returns "stable" for flat data', () => {
    const points = makeTrend([10, 10, 10, 10, 10, 10])
    expect(summarizeTrend(points)).toBe('stable')
  })

  it('detects rising trend', () => {
    // prior 3 avg = 10, recent 3 avg = 20 → up 100%
    const points = makeTrend([10, 10, 10, 20, 20, 20])
    const result = summarizeTrend(points)
    expect(result).toContain('up')
    expect(result).toContain('100')
  })

  it('detects falling trend', () => {
    // prior 3 avg = 20, recent 3 avg = 10 → down 50%
    const points = makeTrend([20, 20, 20, 10, 10, 10])
    const result = summarizeTrend(points)
    expect(result).toContain('down')
    expect(result).toContain('50')
  })
})

describe('buildExportRows', () => {
  it('produces correct row count and field values', () => {
    const metricsByCluster: Record<ClusterId, Metric[]> = {
      readiness: [makeMetric({ id: 'r1', title: 'Metric R1' })],
      momentum: [makeMetric({ id: 'm1', title: 'Metric M1' })],
      experience: [],
      diversity: [],
      economics: [makeMetric({ id: 'e1', title: 'Metric E1', rag: 'red', alarm: 'Off target' })],
    }

    const trends: Record<string, TrendPoint[]> = {
      r1: makeTrend([10, 10, 10, 10, 10, 10]),
    }

    const rows = buildExportRows(metricsByCluster, trends, {})
    expect(rows).toHaveLength(3)

    // Check order: readiness first, economics last
    expect(rows[0].cluster).toBe('readiness')
    expect(rows[0].metricId).toBe('r1')
    expect(rows[0].trendSummary).toBe('stable')

    expect(rows[2].cluster).toBe('economics')
    expect(rows[2].alarm).toBe('Off target')

    // No trend data for m1
    expect(rows[1].trendSummary).toBe('no data')
  })
})

describe('exportMetricsToCsv', () => {
  it('produces parseable CSV with correct headers', () => {
    const metricsByCluster: Record<ClusterId, Metric[]> = {
      readiness: [makeMetric({ id: 'r1', title: 'R1' })],
      momentum: [],
      experience: [],
      diversity: [],
      economics: [],
    }

    const csv = exportMetricsToCsv(metricsByCluster, {}, {})
    expect(typeof csv).toBe('string')

    const parsed = Papa.parse(csv, { header: true })
    expect(parsed.data).toHaveLength(1)

    const row = parsed.data[0] as Record<string, string>
    expect(row.cluster).toBe('readiness')
    expect(row.metricId).toBe('r1')
    expect(row.title).toBe('R1')
    expect(row.rag).toBe('green')
    // Check all expected headers exist
    const headers = parsed.meta.fields!
    expect(headers).toContain('trendSummary')
    expect(headers).toContain('supportingFacts')
  })
})

describe('exportMetricsToXlsx', () => {
  it('produces a Blob with correct MIME type', () => {
    const metricsByCluster: Record<ClusterId, Metric[]> = {
      readiness: [makeMetric({ id: 'r1', title: 'R1' })],
      momentum: [],
      experience: [],
      diversity: [],
      economics: [],
    }

    const blob = exportMetricsToXlsx(metricsByCluster, {}, {})
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(blob.size).toBeGreaterThan(0)
  })
})
