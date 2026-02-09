import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import { MessageResponse } from '@/components/ai-elements/message'
import type { CockpitUIMessage } from './tools'

export function ChatParts({
  message,
  onConfirmTool,
}: {
  message: CockpitUIMessage
  onConfirmTool: (toolCallId: string, approved: boolean) => void
}) {
  return (
    <>
      {message.parts.map((part, idx) => {
        // Plain text.
        if (part.type === 'text') {
          // Use ai-elements Streamdown renderer (GFM tables, lists, etc).
          return <MessageResponse key={idx}>{part.text}</MessageResponse>
        }

        // Optional multi-step boundary.
        if (part.type === 'step-start') {
          return (
            <div key={idx} className="my-2 border-t border-slate-900/10 dark:border-white/10" />
          )
        }

        // Server-side tool (executed automatically): retrieveDocs
        if (part.type === 'tool-retrieveDocs') {
          return <ToolRow key={part.toolCallId} name="retrieveDocs" state={part.state} />
        }

        // Auto client-side tool: openFilters
        if (part.type === 'tool-openFilters') {
          return <ToolRow key={part.toolCallId} name="openFilters" state={part.state} />
        }

        // Auto client-side tool: expandMetric
        if (part.type === 'tool-expandMetric') {
          return (
            <ToolRow
              key={part.toolCallId}
              name="expandMetric"
              state={part.state}
              details={
                part.state === 'input-available' || part.state === 'output-available'
                  ? part.input?.metricId
                  : undefined
              }
            />
          )
        }

        // User-interaction tool: askForConfirmation
        if (part.type === 'tool-askForConfirmation') {
          const callId = part.toolCallId
          if (part.state === 'input-streaming') return <ToolRow key={callId} name="askForConfirmation" state={part.state} />
          if (part.state === 'input-available') {
            return (
              <div key={callId} className="mt-2 rounded-[16px] border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{part.input.message}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirmTool(callId, true)}
                    className="rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:brightness-110 active:scale-[0.98]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmTool(callId, false)}
                    className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )
          }
          if (part.state === 'output-available') {
            return (
              <div key={callId} className="mt-2 rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                Confirmation: {String(part.output)}
              </div>
            )
          }
          if (part.state === 'output-error') {
            return (
              <div key={callId} className="mt-2 rounded-[16px] border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                Error: {part.errorText}
              </div>
            )
          }
        }

        // Fallback for dynamic tools.
        if (part.type === 'dynamic-tool') {
          return (
            <div key={idx} className="mt-2 rounded-[16px] border border-slate-900/10 bg-white/55 p-3 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              Tool: <span className="font-black">{part.toolName}</span> ({part.state})
            </div>
          )
        }

        return null
      })}
    </>
  )
}

function ToolRow({ name, state, details }: { name: string; state: string; details?: string }) {
  const label =
    state === 'input-streaming'
      ? 'preparing'
      : state === 'input-available'
        ? 'running'
        : state === 'output-available'
          ? 'done'
          : state === 'output-error'
            ? 'error'
            : state

  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10')}>
        <Icon name="handyman" className="text-[16px]" />
      </span>
      <span className="font-black text-slate-700 dark:text-slate-200">{name}</span>
      <span className="opacity-70">{label}</span>
      {details ? <span className="truncate opacity-80">({details})</span> : null}
    </div>
  )
}
