import { useMemo } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { ClusterId, Metric } from '../model'

export function ClusterBrief({
  activeCluster,
  metricSnapshot,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag'>>
  }
}) {
  const basePrompt = useMemo(() => {
    return (
      'Write an executive brief for the active cluster.\n' +
      '- Output 3 bullets max.\n' +
      '- Mention the 2 most critical metrics (red first, then amber) with their valueText and thresholdText.\n' +
      '- End with 1 concrete recommended action.\n'
    )
  }, [])

  const { completion, complete, isLoading, error, stop } = useCompletion({
    api: '/api/completion',
    body: {
      activeCluster,
      metricSnapshot,
      filters: null,
    },
  })

  return (
    <section className="rounded-[24px] border border-slate-900/10 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Executive Brief
          </div>
          <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white">
            AI summary for {activeCluster}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isLoading) && (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
            >
              <Icon name="stop" className="text-[18px]" />
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => complete(basePrompt)}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white',
              'shadow-[0_16px_40px_rgba(33,150,243,0.22)] transition hover:brightness-110 active:scale-[0.98]',
              'disabled:opacity-50',
            )}
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Generate
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] font-semibold text-rose-700 dark:text-rose-200">
          Something went wrong. If you are running locally via `npm run dev`, `/api/completion` may not be available.
        </div>
      )}

      <div className="mt-3 rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[12px] font-semibold leading-snug text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        {completion ? (
          <div className="whitespace-pre-wrap">{completion}</div>
        ) : (
          <div className="text-slate-500 dark:text-slate-400">
            Click Generate to stream a concise executive summary for this cluster.
          </div>
        )}
      </div>
    </section>
  )
}

