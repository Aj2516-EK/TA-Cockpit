import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

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
            <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[12px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              UI-only for now.
              <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Next: connect to `/api/ai` (tool-driven retrieval + aggregates-only).
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900/10 p-4 dark:border-white/10">
            <div className="flex items-center gap-2 rounded-[18px] border border-slate-900/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <Icon name="spark" className="text-[18px] text-[color:var(--ta-primary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask AI: trends, drivers, recommendations..."
                className="w-full bg-transparent text-[12px] font-bold text-slate-900 placeholder:text-slate-400 outline-none dark:text-white"
              />
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                <Icon name="send" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

