import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'

export function FiltersDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[56] h-dvh w-[360px] max-w-[92vw] border-l border-slate-900/10 bg-white/85 backdrop-blur-xl',
          'dark:border-white/10 dark:bg-slate-950/65',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Filters panel"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                <Icon name="filter_list" className="text-[20px]" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Filters
                </div>
                <div className="text-[14px] font-bold text-slate-900 dark:text-white">Dataset slicing</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              aria-label="Close filters"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] font-normal text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              UI-only placeholder.
              <div className="mt-2 text-[12px] font-normal text-slate-500 dark:text-slate-400">
                Next: populate options from uploaded dataset (Business Unit, Role, Location, Gender, date range, etc.).
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900/10 p-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex-1 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              >
                Clear
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
