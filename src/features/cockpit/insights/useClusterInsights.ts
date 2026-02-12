import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClusterId, Metric } from '../model'
import type { InsightContext } from '../runtime-data/insights'
import type { Filters } from '../runtime-data/types'

type InsightResult = {
  headline: string
  bullets: string[]
  action: string
  watchouts: string[]
  generatedAt?: string
  source?: 'llm' | 'fallback'
  error?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

type GenerateOptions = {
  force?: boolean
}

const CACHE_PREFIX = 'ta_cluster_insights'
const CACHE_VERSION = 'v1'

function sortStringArray(values: string[]): string[] {
  return values.slice().sort((a, b) => a.localeCompare(b))
}

function normalizeFilters(filters: Filters) {
  const entries = Object.entries(filters).filter(([, v]) => v != null)
  const normalized = entries.map(([key, value]) => {
    if (Array.isArray(value)) return [key, sortStringArray(value)] as const
    return [key, value] as const
  })
  normalized.sort((a, b) => a[0].localeCompare(b[0]))
  return Object.fromEntries(normalized)
}

function normalizeMetrics(
  metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>,
) {
  return metrics
    .map((m) => ({
      id: m.id,
      title: m.title,
      valueText: m.valueText,
      thresholdText: m.thresholdText,
      rag: m.rag,
      supportingFacts: Array.isArray(m.supportingFacts) ? sortStringArray(m.supportingFacts) : [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort((a, b) => a.localeCompare(b))
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`
  }
  const encoded = JSON.stringify(value)
  return encoded === undefined ? 'null' : encoded
}

function hashString(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(36)
}

function buildCacheKey({
  activeCluster,
  metricSnapshot,
  filters,
  insightContext,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>
  }
  filters: Filters
  insightContext: InsightContext | null
}): string {
  const payload = {
    activeCluster,
    filters: normalizeFilters(filters),
    metrics: normalizeMetrics(metricSnapshot.metrics),
    insightContext,
  }
  const raw = stableStringify(payload)
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${hashString(raw)}`
}

function isInsightResult(value: unknown): value is InsightResult {
  if (!value || typeof value !== 'object') return false
  const v = value as InsightResult
  return typeof v.headline === 'string' && Array.isArray(v.bullets) && typeof v.action === 'string'
}

export function useClusterInsights({
  activeCluster,
  metricSnapshot,
  filters,
  insightContext,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>
  }
  filters: Filters
  insightContext: InsightContext | null
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<InsightResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<InsightResult | null>(null)

  const storageKey = buildCacheKey({ activeCluster, metricSnapshot, filters, insightContext })

  const readCache = useCallback((): InsightResult | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return isInsightResult(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [storageKey])

  const writeCache = useCallback(
    (payload: InsightResult) => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload))
      } catch {
        // Ignore cache write failures.
      }
    },
    [storageKey],
  )

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cacheRef.current = null

    const cached = readCache()
    if (cached) {
      cacheRef.current = cached
      setData(cached)
      setError(null)
      setStatus('success')
      return
    }

    setData(null)
    setError(null)
    setStatus('idle')
  }, [readCache])

  const generate = useCallback(
    async (options: GenerateOptions = {}): Promise<boolean> => {
      if (!options.force) {
        const cached = cacheRef.current ?? readCache()
        if (cached) {
          cacheRef.current = cached
          setData(cached)
          setError(null)
          setStatus('success')
          return true
        }
      }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeCluster,
          metricSnapshot,
          filters,
          insightContext,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Insights request failed (${res.status})`)
      }

      const json = (await res.json()) as InsightResult
      setData(json)
      setStatus('success')
      cacheRef.current = json
      writeCache(json)
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStatus('idle')
        return false
      }
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
      return false
    }
  },
    [activeCluster, metricSnapshot, filters, insightContext, readCache, writeCache],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus((s) => (s === 'loading' ? 'idle' : s))
  }, [])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  return {
    status,
    data,
    error,
    isLoading: status === 'loading',
    generate,
    stop,
    clear: () => {
      setData(null)
      setError(null)
      setStatus('idle')
    },
  }
}
