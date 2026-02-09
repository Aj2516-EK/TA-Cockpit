import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { KeyInsight } from '../model'
import { ragPillClass } from '../ui/ragStyles'

export function KeyInsightsPanel({ insights }: { insights: KeyInsight[] }) {
  return (
    <section className="rounded-[24px] border border-slate-900/10 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Key Insights
          </div>
          <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white">Critical signals to act on</div>
        </div>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Red and amber first</span>
      </div>

      <div className="mt-3 grid gap-2">
        {insights.map((i) => (
          <div
            key={i.metricId}
            className="rounded-[18px] border border-slate-900/10 bg-white/50 p-3 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-start gap-3">
              <span className={cn('mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl', ragPillClass(i.rag))}>
                <Icon name={i.icon} className="text-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-extrabold text-slate-900 dark:text-white">{i.title}</div>
                <div className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-600 dark:text-slate-300">
                  {i.text}
                </div>
              </div>
              <Icon name="chevron_right" className="mt-1 text-[18px] text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

