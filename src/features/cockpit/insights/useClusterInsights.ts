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

  const generate = useCallback(async (): Promise<boolean> => {
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
  }, [activeCluster, metricSnapshot, filters, insightContext])

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
