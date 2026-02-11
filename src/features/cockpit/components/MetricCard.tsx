import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { Metric } from '../model'
import { ragCardClass, ragPillClass } from '../ui/ragStyles'

export function MetricCard({
  metric,
  expanded,
  onToggle,
}: {
  metric: Metric
  expanded: boolean
  onToggle: () => void
}) {
  const contentId = `${metric.id}-content`

  return (
    <div
      id={metric.id}
      className={cn('rounded-[26px] border p-4 bg-white/65 dark:bg-slate-950/25', ragCardClass(metric.rag))}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl', ragPillClass(metric.rag))}>
            <Icon name={metric.icon} className="text-[20px]" />
          </span>
          <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider', ragPillClass(metric.rag))}>
            {metric.rag}
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white">{metric.title}</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">{metric.valueText}</div>
            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Target: {metric.thresholdText}</div>
          </div>
        </div>
      </button>

      <div className={cn('grid transition-all', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div id={contentId} className="min-h-0 overflow-hidden">
          <div className="mt-4 space-y-3">
            <Section label="Alarm" value={metric.alarm} tone="strong" />
            <Section label="AI Insight" value={metric.insight} />
            <Section label="Recommended Action" value={metric.action} />
            {(metric.supportingFacts ?? []).length > 0 && (
              <Section
                label="Supporting Facts"
                value={(metric.supportingFacts ?? []).join('\n')}
              />
            )}

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
            >
              <Icon name="info" className="text-[18px]" />
              Metric Definition (Next)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'strong'
}) {
  const isMultiLine = value.includes('\n')
  return (
    <div className="rounded-[18px] border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300',
          tone === 'strong' && 'font-medium text-slate-800 dark:text-slate-200',
          tone !== 'strong' && 'font-normal',
        )}
      >
        {isMultiLine ? <div className="whitespace-pre-wrap">{value}</div> : value}
      </div>
    </div>
  )
}
