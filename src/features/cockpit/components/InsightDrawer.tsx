import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import { MessageResponse } from '@/components/ai-elements/message'
import type { ClusterMeta, Metric } from '../model'
import { gapToTargetText, meaningForMetric, ragLabel } from '../model/metricExplain'
import type { ReactNode } from 'react'
import { ragPillClass } from '../ui/ragStyles'

export function InsightDrawer({
  open,
  onClose,
  cluster,
  metric,
}: {
  open: boolean
  onClose: () => void
  cluster: ClusterMeta | null
  metric: Metric | null
}) {
  const gap = metric ? gapToTargetText(metric) : null
  const meaning = metric ? meaningForMetric(metric.id) : null

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[62] bg-black/30 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[63] h-dvh w-full border-l border-slate-900/10 bg-white/90 backdrop-blur-xl sm:w-[520px] sm:max-w-[96vw]',
          'dark:border-white/10 dark:bg-slate-950/85',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Insight details"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                <Icon name="tips_and_updates" className="text-[20px]" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Key Insight
                </div>
                <div className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {metric ? metric.title : '—'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              aria-label="Close insight details"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!metric ? (
              <Card>Pick an insight to see details.</Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Snapshot
                      </div>
                      <div className="mt-1 text-[14px] font-bold text-slate-900 dark:text-white">
                        {metric.valueText}{' '}
                        <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                          (target {metric.thresholdText})
                        </span>
                      </div>
                      {gap && (
                        <div className="mt-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                          {gap}
                        </div>
                      )}
                      <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                        Cluster: <span className="font-semibold">{cluster?.title ?? '—'}</span>
                      </div>
                    </div>
                    <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider', ragPillClass(metric.rag))}>
                      {ragLabel(metric.rag)}
                    </span>
                  </div>
                </Card>

                <Section title="What This Means">
                  <Card>
                    <div className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {meaning?.meaning}
                    </div>
                  </Card>
                </Section>

                <Section title="How We Compute It (MVP)">
                  <Card>
                    <div className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {meaning?.formula}
                    </div>
                    {metric.supportingFacts?.length ? (
                      <ul className="mt-3 list-disc pl-5 text-[12px] text-slate-600 dark:text-slate-300">
                        {metric.supportingFacts.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">No supporting facts.</div>
                    )}
                  </Card>
                </Section>

                <Section title="Decision Narrative">
                  <Card>
                    <MessageResponse>
                      {`**${ragLabel(metric.rag)}** — ${metric.alarm}\n\n**Interpretation:** ${metric.insight}\n\n**Recommended action:** ${metric.action}`}
                    </MessageResponse>
                  </Card>
                </Section>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {title}
      </div>
      {children}
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      {children}
    </div>
  )
}

