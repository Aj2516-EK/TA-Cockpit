import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { Metric } from '../model'
import { ragCardClass, ragPillClass } from '../ui/ragStyles'

const ASSIGNEES = ['John', 'Jerry', 'Jack', 'Jina', 'Jisha', 'Jamal']

export type MetricAssignment = {
  owner: string
  note: string
  targetDate: string
  assignedAt: string
}

export function MetricCard({
  metric,
  expanded,
  onToggle,
  onVisualize,
  assignment,
  onAssign,
  onClearAssignment,
}: {
  metric: Metric
  expanded: boolean
  onToggle: () => void
  onVisualize: () => void
  assignment?: MetricAssignment
  onAssign: (assignment: MetricAssignment) => void
  onClearAssignment: () => void
}) {
  const contentId = `${metric.id}-content`
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignee, setAssignee] = useState(assignment?.owner ?? ASSIGNEES[0])
  const [note, setNote] = useState(assignment?.note ?? '')
  const [targetDate, setTargetDate] = useState(assignment?.targetDate ?? '')

  const openAssign = () => {
    setAssignee(assignment?.owner ?? ASSIGNEES[0])
    setNote(assignment?.note ?? '')
    setTargetDate(assignment?.targetDate ?? '')
    setAssignOpen(true)
  }

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

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onVisualize()
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-[color:var(--ta-primary)]/40 transition hover:brightness-110 active:scale-[0.98]"
        >
          <Icon name="show_chart" className="text-[18px]" />
          Visualize
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            openAssign()
            if (!expanded) onToggle()
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
        >
          <Icon name="assignment_ind" className="text-[18px]" />
          {assignment ? 'Reassign' : 'Assign Owner'}
        </button>
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
    </div>
  )
}

function AssignmentCard({ assignment, onClear }: { assignment: MetricAssignment; onClear: () => void }) {
  const assignedAt = new Date(assignment.assignedAt)
  const assignedLabel = Number.isFinite(assignedAt.getTime())
    ? assignedAt.toLocaleString()
    : assignment.assignedAt

  return (
    <div className="rounded-[18px] border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Assigned Owner
          </div>
          <div className="mt-1 text-[14px] font-bold text-slate-900 dark:text-white">{assignment.owner}</div>
          {assignment.note ? (
            <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">{assignment.note}</div>
          ) : null}
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Target: {assignment.targetDate || 'TBD'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Assigned: {assignedLabel}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-slate-900/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
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
