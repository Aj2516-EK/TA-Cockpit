import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'

export function TopBar({
  darkMode,
  onToggleDarkMode,
  onOpenFilters,
  datasetLabel,
  onOpenDataInspector,
}: {
  darkMode: boolean
  onToggleDarkMode: () => void
  onOpenFilters: () => void
  datasetLabel: string
  onOpenDataInspector: () => void
}) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 border-b border-slate-900/10 bg-white/55 px-4 py-3 backdrop-blur',
        'dark:border-white/10 dark:bg-slate-950/25',
      )}
    >
      <div className="min-w-0">
        <div className="truncate bg-gradient-to-r from-slate-500 via-orange-500 to-slate-500 bg-clip-text text-[32px] font-black tracking-[0.08em] text-transparent drop-shadow-[0_0_16px_rgba(251,146,60,0.45)]">
          FIKRAH
        </div>
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
          Talent Acquisition Intelligence Cockpit
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-medium text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 sm:inline-flex">
          <Icon name="dataset" className="text-[18px]" />
          <span className="max-w-[220px] truncate">{datasetLabel}</span>
        </span>

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-3 py-2',
            'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10',
            'dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7',
          )}
          aria-label="Open filters"
          title="Filters"
        >
          <Icon name="filter_list" className="text-[18px]" />
          <span className="hidden text-[11px] font-bold sm:inline">Filters</span>
        </button>

        <button
          type="button"
          onClick={onOpenDataInspector}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-3 py-2',
            'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10',
            'dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7',
          )}
          aria-label="Open data inspector"
          title="Data inspector"
        >
          <Icon name="table_view" className="text-[18px]" />
          <span className="hidden text-[11px] font-bold sm:inline">Data</span>
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
            'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10',
            'dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7',
          )}
          aria-label="Toggle theme"
          title="Theme"
        >
          <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className="text-[20px]" />
        </button>

        <span className="hidden items-center gap-2 rounded-2xl bg-[color:var(--ta-primary)]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20 dark:bg-[color:var(--ta-primary)]/15 sm:inline-flex">
          <Icon name="account_circle" className="text-[18px]" />
          HR Leader
        </span>
      </div>
    </header>
  )
}
