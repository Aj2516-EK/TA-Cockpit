import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { ClusterId, Metric } from '../model'
import { useCockpitChat } from '../chat/useCockpitChat'
import { ChatParts } from '../chat/ChatParts'
import type { CockpitUIMessage } from '../chat/tools'
import type { InsightContext } from '../runtime-data/insights'
import type { Filters } from '../runtime-data/types'

export function ChatWidget({
  activeCluster,
  metricSnapshot,
  insightContext,
  filters,
  contextVersion,
  onOpenFilters,
  onExpandMetric,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>
  }
  insightContext: InsightContext | null
  filters: Filters
  contextVersion: number
  onOpenFilters: () => void
  onExpandMetric: (metricId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { messages, sendMessage, status, stop, error, addToolOutput } = useCockpitChat({
    activeCluster,
    metricSnapshot,
    insightContext,
    filters,
    onOpenFilters,
    onExpandMetric,
  })

  const [input, setInput] = useState('')
  const [contextUpdated, setContextUpdated] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Avoid synchronous setState inside effects (eslint react-hooks/set-state-in-effect).
    const tShow = window.setTimeout(() => setContextUpdated(true), 0)
    const tHide = window.setTimeout(() => setContextUpdated(false), 1600)
    return () => {
      window.clearTimeout(tShow)
      window.clearTimeout(tHide)
    }
  }, [contextVersion, open])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || status !== 'ready') return

    sendMessage({ text })
    setInput('')
  }

  return (
    <>
      {/* FAB trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-2xl',
          'bg-[color:var(--ta-primary)] text-white shadow-[0_18px_60px_rgba(33,150,243,0.35)]',
          'transition hover:brightness-110 active:scale-[0.98]',
        )}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        title="Ask AI"
      >
        <Icon name={open ? 'close' : 'auto_awesome'} className="text-[22px]" />
      </button>

      {/* Floating chat panel */}
      <div
        className={cn(
          'fixed bottom-20 right-5 z-[60] flex h-[520px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col',
          'rounded-[24px] border border-slate-900/10 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl',
          'dark:border-white/10 dark:bg-slate-950/80',
          'origin-bottom-right transition-all duration-200',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
        aria-label="AI chat panel"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20">
            <Icon name="auto_awesome" className="text-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-slate-900 dark:text-white">AI Advisor</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/5 text-slate-600 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/7"
            aria-label="Close AI chat"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <StatusRow status={status} onStop={stop} />
          {contextUpdated && (
            <div className="mb-3 rounded-[14px] border border-[color:var(--ta-primary)]/20 bg-[color:var(--ta-primary)]/10 p-2 text-[12px] font-medium text-[color:var(--ta-primary)]">
              Context updated (filters/dataset changed)
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-[14px] border border-rose-500/20 bg-rose-500/10 p-3 text-[13px] font-normal text-rose-700 dark:text-rose-200">
              {String(error.message || '').toLowerCase().includes('rate')
                ? 'Rate limit hit upstream. Please retry in 30 to 60 seconds.'
                : 'Something went wrong. If you are running locally, make sure you are using `vercel dev` (not `vite`).'}
            </div>
          )}

          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 text-[13px] font-normal text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Ask about drivers, bottlenecks, or actions.
                <div className="mt-1.5 text-[12px] font-normal text-slate-500 dark:text-slate-400">
                  Uses the current cluster and KPI snapshot.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    'Why are the red KPIs red in this cluster?',
                    'What are the top 3 drivers of delay and what should we do next week?',
                    'Which filter slice would most improve the worst KPI?',
                    'Summarize the KPI snapshot in 5 bullets (no made-up numbers).',
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (status !== 'ready') return
                        sendMessage({ text: p })
                      }}
                      className="rounded-2xl bg-slate-900/5 px-3 py-1.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onConfirm={(toolCallId, approved) => {
                  addToolOutput({
                    tool: 'askForConfirmation',
                    toolCallId,
                    output: approved ? 'Approved' : 'Denied',
                  })
                }}
              />
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-slate-900/10 px-4 py-3 dark:border-white/10">
          <form onSubmit={onSubmit}>
            <div className="flex items-center gap-2 rounded-[14px] border border-slate-900/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about metrics..."
                className="w-full bg-transparent text-[13px] font-normal text-slate-900 placeholder:text-slate-400 outline-none dark:text-white"
                disabled={status !== 'ready'}
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[color:var(--ta-primary)] px-2.5 py-1.5 text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                disabled={status !== 'ready'}
                aria-label="Send message"
              >
                <Icon name="send" className="text-[16px]" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function StatusRow({
  status,
  onStop,
}: {
  status: string
  onStop: () => void
}) {
  // Hide pending-connection UI to avoid "stuck connecting" perception.
  if (status !== 'streaming') return null
  return (
    <div className="mb-3 rounded-[14px] border border-[color:var(--ta-primary)]/20 bg-[color:var(--ta-primary)]/8 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:var(--ta-primary)]">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--ta-primary)]/55" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--ta-primary)]" />
            </span>
            AI is generating response
          </div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Receiving tokens...</div>
          <div className="mt-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <div className="h-1.5 w-2/5 rounded-full bg-[linear-gradient(90deg,rgba(33,150,243,0.18),rgba(33,150,243,0.9),rgba(33,150,243,0.18))] [animation:ta-chat-shimmer_1.4s_ease-in-out_infinite]" />
          </div>
          <div className="mt-2 inline-flex gap-1">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-[color:var(--ta-primary)] [animation:ta-chat-dot_1s_ease-in-out_infinite]"
                style={{ animationDelay: `${dot * 120}ms` }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
        >
          Stop
        </button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onConfirm,
}: {
  message: CockpitUIMessage
  onConfirm: (toolCallId: string, approved: boolean) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[14px] border px-3 py-2 text-[13px] font-normal leading-relaxed',
          isUser
            ? 'border-[color:var(--ta-primary)]/25 bg-[color:var(--ta-primary)]/10 text-slate-900 dark:text-white'
            : 'border-slate-900/10 bg-white/60 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        )}
      >
        <ChatParts message={message} onConfirmTool={onConfirm} />
      </div>
    </div>
  )
}
