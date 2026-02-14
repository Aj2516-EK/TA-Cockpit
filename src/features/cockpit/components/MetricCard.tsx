import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { Metric } from '../model'
import { meaningForMetric } from '../model/metricExplain'
import { ragCardClass, ragPillClass } from '../ui/ragStyles'
import { MetricViz } from './viz/MetricViz'
import type { TrendPoint } from '../runtime-data/trends'

import type { MetricAssignment } from '../runtime-data/assignments'
export type { MetricAssignment } from '../runtime-data/assignments'

const ASSIGNEES = ['John', 'Jerry', 'Jack', 'Jina', 'Jisha', 'Jamal']

export function MetricCard({
  metric,
  expanded,
  onToggle,
  trend,
  assignment,
  onAssign,
  onClearAssignment,
}: {
  metric: Metric
  expanded: boolean
  onToggle: () => void
  trend?: TrendPoint[]
  assignment?: MetricAssignment
  onAssign: (assignment: MetricAssignment) => void
  onClearAssignment: () => void
}) {
  const contentId = `${metric.id}-content`
  const [vizOpen, setVizOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [assignee, setAssignee] = useState(assignment?.owner ?? ASSIGNEES[0])
  const [note, setNote] = useState(assignment?.note ?? '')
  const [targetDate, setTargetDate] = useState(assignment?.targetDate ?? '')
  const meta = meaningForMetric(metric.id)

  const openAssign = () => {
    setAssignee(assignment?.owner ?? ASSIGNEES[0])
    setNote(assignment?.note ?? '')
    setTargetDate(assignment?.targetDate ?? '')
    setAssignOpen(true)
  }

  return (
    <div id={metric.id} className={cn('rounded-[26px] border bg-slate-950/25 p-4', ragCardClass(metric.rag))}>
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
          <span
            onClick={(event) => {
              event.stopPropagation()
              setInfoOpen(true)
            }}
            className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full', ragPillClass(metric.rag))}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                setInfoOpen(true)
              }
            }}
            aria-label={`Open metric definition for ${metric.title}`}
            title="Metric definition and formula"
          >
            <Icon name="info" className="text-[16px]" />
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[13px] font-semibold tracking-tight text-white">{metric.title}</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="text-[22px] font-bold tracking-tight text-white">{metric.valueText}</div>
            <div className="text-[11px] font-medium text-slate-300">Target: {metric.thresholdText}</div>
          </div>
        </div>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setVizOpen((v) => !v)
          }}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider ring-1 transition active:scale-[0.98]',
            vizOpen
              ? 'bg-[color:var(--ta-primary)] text-white ring-[color:var(--ta-primary)]/40 hover:brightness-110'
              : 'bg-[color:var(--ta-primary)]/10 text-[color:var(--ta-primary)] ring-[color:var(--ta-primary)]/25 hover:bg-[color:var(--ta-primary)]/20',
          )}
        >
          <Icon name="show_chart" className="text-[18px]" />
          {vizOpen ? 'Hide Chart' : 'Visualize'}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            openAssign()
            if (!expanded) onToggle()
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <Icon name="assignment_ind" className="text-[18px]" />
          {assignment ? 'Reassign' : 'Assign Owner'}
        </button>
      </div>

      {/* Inline visualization — toggled by Visualize button */}
      <div className={cn('grid transition-all duration-300', vizOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {metric.title} — Trend & Gauge
            </div>
            <MetricViz metric={metric} trend={trend} />
          </div>
        </div>
      </div>

      <div className={cn('grid transition-all', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div id={contentId} className="min-h-0 overflow-hidden">
          <div className="mt-4 space-y-3">
            <Section label="Alarm" value={metric.alarm} tone="strong" />
            <Section label="AI Insight" value={metric.insight} />
            <Section label="Recommended Action" value={metric.action} />
            {(metric.supportingFacts ?? []).length > 0 && (
              <Section label="Supporting Facts" value={(metric.supportingFacts ?? []).join('\n')} />
            )}

            {assignment ? (
              <AssignmentCard assignment={assignment} onClear={onClearAssignment} />
            ) : null}

            {assignOpen ? (
              <div className="rounded-[18px] border border-slate-900/10 bg-slate-950/90 p-3 text-[12px] text-white shadow-sm dark:border-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Assign Owner
                </div>
                <div className="mt-2 space-y-2">
                  <select
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-[12px] font-semibold text-white"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    {ASSIGNEES.map((name) => (
                      <option key={name} value={name} className="text-slate-900">
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-[12px] text-white placeholder-white/60"
                    placeholder="Instructions..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Target Completion Date
                    </div>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-[12px] text-white"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900"
                      onClick={() => {
                        const assignedAt = new Date().toISOString()
                        onAssign({
                          owner: assignee,
                          note: note.trim(),
                          targetDate,
                          assignedAt,
                          status: 'assigned',
                          resolvedAt: null,
                        })
                        setAssignOpen(false)
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-white/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80"
                      onClick={() => setAssignOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {infoOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-[540px] rounded-[22px] border border-white/15 bg-slate-900 p-5 text-left shadow-[0_16px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Metric Details</div>
                <div className="mt-1 text-[17px] font-bold text-white">{metric.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
                aria-label="Close metric details"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Definition</div>
                <div className="mt-1 text-[13px] leading-relaxed text-slate-200">{meta.meaning}</div>
              </div>
              <div className="rounded-[16px] border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Formula</div>
                <div className="mt-1 text-[13px] leading-relaxed text-slate-200">{meta.formula}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AssignmentCard({ assignment, onClear }: { assignment: MetricAssignment; onClear: () => void }) {
  const assignedAt = new Date(assignment.assignedAt)
  const assignedLabel = Number.isFinite(assignedAt.getTime())
    ? assignedAt.toLocaleString()
    : assignment.assignedAt

  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Assigned Owner
          </div>
          <div className="mt-1 text-[14px] font-bold text-white">{assignment.owner}</div>
          {assignment.note ? (
            <div className="mt-1 text-[12px] text-slate-300">{assignment.note}</div>
          ) : null}
          <div className="mt-2 text-[11px] text-slate-400">
            Target: {assignment.targetDate || 'TBD'}
          </div>
          <div className="text-[11px] text-slate-400">Assigned: {assignedLabel}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Clear
        </button>
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
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-[13px] leading-relaxed text-slate-300',
          tone === 'strong' && 'font-medium text-slate-200',
          tone !== 'strong' && 'font-normal',
        )}
      >
        {isMultiLine ? <div className="whitespace-pre-wrap">{value}</div> : value}
      </div>
    </div>
  )
}
