import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import type { ClusterId, Metric } from '../model'

export function ChatWidget({
  activeCluster,
  metricSnapshot,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag'>>
  }
}) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
      }),
    [],
  )

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  })

  const [input, setInput] = useState('')

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || status !== 'ready') return

    sendMessage(
      { text },
      {
        body: {
          activeCluster,
          metricSnapshot,
          // MVP: filters will be added once the dataset upload + filter UI is wired.
          filters: null,
        },
      },
    )
    setInput('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-2xl',
          'bg-[color:var(--ta-primary)] text-white shadow-[0_18px_60px_rgba(33,150,243,0.35)]',
          'transition hover:brightness-110 active:scale-[0.98]',
        )}
        aria-label="Open AI chat"
        title="Ask AI"
      >
        <Icon name="auto_awesome" className="text-[22px]" />
      </button>

      <div
        className={cn(
          'fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-[80] h-dvh w-[420px] max-w-[92vw] border-l border-slate-900/10 bg-white/85 backdrop-blur-xl',
          'dark:border-white/10 dark:bg-slate-950/65',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="AI chat panel"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20">
                <Icon name="auto_awesome" className="text-[20px]" />
              </span>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  AI Advisor
                </div>
                <div className="text-[13px] font-extrabold text-slate-900 dark:text-white">Ask about metrics</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              aria-label="Close AI chat"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <StatusRow status={status} onStop={stop} />

            {error && (
              <div className="mb-3 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] font-semibold text-rose-700 dark:text-rose-200">
                Something went wrong. If you are running locally via `npm run dev`, `/api/chat` may not be available.
              </div>
            )}

            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[12px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  Ask about drivers, bottlenecks, or actions.
                  <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    The assistant will use the current cluster and KPI snapshot.
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-900/10 p-4 dark:border-white/10">
            <form onSubmit={onSubmit}>
              <div className="flex items-center gap-2 rounded-[18px] border border-slate-900/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <Icon name="auto_awesome" className="text-[18px] text-[color:var(--ta-primary)]" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI: trends, drivers, recommendations..."
                  className="w-full bg-transparent text-[12px] font-bold text-slate-900 placeholder:text-slate-400 outline-none dark:text-white"
                  disabled={status !== 'ready'}
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  disabled={status !== 'ready'}
                  aria-label="Send message"
                >
                  <Icon name="send" className="text-[18px]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}

function StatusRow({ status, onStop }: { status: string; onStop: () => void }) {
  if (status !== 'submitted' && status !== 'streaming') return null
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {status === 'submitted' ? 'Connecting...' : 'Streaming...'}
      </div>
      <button
        type="button"
        onClick={onStop}
        className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
      >
        Stop
      </button>
    </div>
  )
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[18px] border px-3 py-2 text-[12px] font-semibold leading-snug',
          isUser
            ? 'border-[color:var(--ta-primary)]/25 bg-[color:var(--ta-primary)]/10 text-slate-900 dark:text-white'
            : 'border-slate-900/10 bg-white/60 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
        )}
      >
        {message.parts.map((part, idx) => {
          if (part.type === 'text') return <span key={idx}>{part.text}</span>
          if (part.type === 'tool-invocation') {
            return (
              <div key={idx} className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Retrieving context...
              </div>
            )
          }
          if (part.type === 'tool-result') {
            return (
              <div key={idx} className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Context retrieved.
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
