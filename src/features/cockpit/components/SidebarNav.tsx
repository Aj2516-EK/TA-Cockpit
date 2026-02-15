import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { ClusterId, ClusterMeta } from '../model'

export function SidebarNav({
  clusters,
  activeCluster,
  onSelectCluster,
  collapsed,
  onToggleCollapsed,
  onNavigateHome,
}: {
  clusters: ClusterMeta[]
  activeCluster: ClusterId
  onSelectCluster: (id: ClusterId) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  onNavigateHome?: () => void
}) {
  return (
    <aside
      className={cn(
        'h-dvh shrink-0 overflow-hidden border-r border-slate-900/10 bg-white/50 backdrop-blur',
        'dark:border-white/10 dark:bg-slate-950/30',
        'transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[192px]',
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('flex items-center gap-3 px-3 py-3', collapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn('flex items-center gap-2', collapsed && 'hidden')}>
            <button
              type="button"
              onClick={() => onNavigateHome?.()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20 transition hover:bg-[color:var(--ta-primary)]/20"
              aria-label="Go to home dashboard"
              title="Home"
            >
              <Icon name="flight_takeoff" className="text-[20px]" />
            </button>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Home
              </div>
            </div>
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={() => onNavigateHome?.()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20 transition hover:bg-[color:var(--ta-primary)]/20"
              aria-label="Go to home dashboard"
              title="Home"
            >
              <Icon name="flight_takeoff" className="text-[20px]" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
              'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10',
              'dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} className="text-[20px]" />
          </button>
        </div>

        <nav className={cn('mt-2 flex-1 px-2', collapsed ? 'space-y-2' : 'space-y-1')}>
          {clusters.map((c) => {
            const active = c.id === activeCluster
            const accent = `var(${c.colorVar})`
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCluster(c.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition',
                  active
                    ? 'bg-[color:var(--ta-primary)]/12 ring-1 ring-[color:var(--ta-primary)]/20'
                    : 'hover:bg-slate-900/5 dark:hover:bg-white/5',
                )}
                title={collapsed ? c.title : undefined}
              >
                <span
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-2xl ring-1',
                    active
                      ? 'bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-[color:var(--ta-primary)]/20'
                      : 'bg-slate-900/5 text-slate-700 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
                  )}
                  style={active ? undefined : { color: accent }}
                >
                  <Icon name={c.icon} className="text-[20px]" />
                </span>
                <span className={cn('truncate text-[13px] font-medium text-slate-900 dark:text-white', collapsed && 'hidden')}>
                  {c.shortLabel}
                </span>
              </button>
            )
          })}
        </nav>

        <div className={cn('border-t border-slate-900/10 p-3 dark:border-white/10', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
            <div className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400', collapsed && 'hidden')}>
              Demo Mode
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
