import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import { MessageResponse } from '@/components/ai-elements/message'
import type { ClusterId, Metric } from '../model'
import { useClusterInsights } from '../insights/useClusterInsights'
import type { InsightContext } from '../runtime-data/insights'
import type { Filters } from '../runtime-data/types'

export function ClusterBrief({
  activeCluster,
  metricSnapshot,
  filters,
  insightContext,
  contextVersion,
  autoGenerateEnabled,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>
  }
  filters: Filters
  insightContext: InsightContext | null
  contextVersion: number
  autoGenerateEnabled: boolean
}) {
  const contextKey = `${activeCluster}:${contextVersion}`
  const [lastGeneratedContextKey, setLastGeneratedContextKey] = useState<string | null>(null)
  const stale = lastGeneratedContextKey != null && lastGeneratedContextKey !== contextKey
  const autoGenerateRef = useRef<Set<string>>(new Set())

  const { data, generate, isLoading, error, stop } = useClusterInsights({
    activeCluster,
    metricSnapshot,
    filters,
    insightContext,
  })

  async function onGenerate() {
    const ok = await generate({ force: true })
    if (ok) setLastGeneratedContextKey(contextKey)
  }

  useEffect(() => {
    if (!autoGenerateEnabled) return
    if (isLoading) return
    if (lastGeneratedContextKey === contextKey) return
    if (autoGenerateRef.current.has(contextKey)) return
    autoGenerateRef.current.add(contextKey)

    let cancelled = false
    ;(async () => {
      const ok = await generate()
      if (!cancelled && ok) setLastGeneratedContextKey(contextKey)
    })()

    return () => {
      cancelled = true
    }
  }, [autoGenerateEnabled, contextKey, generate, isLoading, lastGeneratedContextKey])

  useEffect(() => {
    if (!data) return
    if (lastGeneratedContextKey === contextKey) return
    setLastGeneratedContextKey(contextKey)
  }, [contextKey, data, lastGeneratedContextKey])

  const formattedText = useMemo(() => {
    if (!data) return ''
    const lines = [data.headline, '', ...data.bullets.map((b) => `- ${b}`), '', `Recommended action: ${data.action}`]
    if (data.watchouts?.length) {
      lines.push('', ...data.watchouts.map((w) => `Watchout: ${w}`))
    }
    return lines.join('\n')
  }, [data])

  return (
    <section className="rounded-[24px] border border-slate-900/10 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Executive Brief
          </div>
          <div className="mt-1 text-[14px] font-bold text-slate-900 dark:text-white">
            AI summary for {activeCluster}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
            >
              <Icon name="stop" className="text-[18px]" />
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white',
              'shadow-[0_16px_40px_rgba(33,150,243,0.22)] transition hover:brightness-110 active:scale-[0.98]',
              'disabled:opacity-50',
            )}
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            {data ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-3 text-[13px] font-normal text-rose-700 dark:text-rose-200">
          Something went wrong. If you are running locally via `npm run dev`, `/api/insights` may not be available.
        </div>
      )}

      {stale && !isLoading && (
        <div className="mt-3 rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] font-medium text-amber-800 dark:text-amber-200">
          Data context changed. Regenerate insights to reflect the latest filters/dataset.
        </div>
      )}

      <div className="mt-3 rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] font-normal leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        {isLoading ? (
          <InsightsLoadingState />
        ) : formattedText ? (
          <MessageResponse>{formattedText}</MessageResponse>
        ) : (
          <div className="text-slate-500 dark:text-slate-400">
            Click Generate to produce data-grounded AI insights for this cluster.
          </div>
        )}
      </div>
    </section>
  )
}

function InsightsLoadingState() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-[color:var(--ta-primary)]">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--ta-primary)]/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--ta-primary)]" />
        </span>
        AI is generating insights
      </div>

      <div className="space-y-2.5">
        {[100, 88, 92].map((width, idx) => (
          <div key={width} className="relative h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <div
              className="absolute inset-y-0 w-2/5 rounded-full bg-[linear-gradient(90deg,transparent,rgba(33,150,243,0.75),transparent)] [animation:ta-insight-shimmer_1.5s_ease-in-out_infinite]"
              style={{ animationDelay: `${idx * 150}ms`, width: `${Math.max(30, width / 3)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Reading KPI trends</span>
        <span className="inline-flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--ta-primary)]/80 [animation:ta-insight-dot_1s_ease-in-out_infinite]"
              style={{ animationDelay: `${dot * 130}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}
