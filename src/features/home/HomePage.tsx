import { useState } from 'react'
import type { ClusterId } from '../cockpit/model'
import { Icon } from '../../ui/Icon'
import { cn } from '../../lib/cn'

const journeyCards: Array<{ id: ClusterId; label: string; subtitle: string; icon: string; accent: string }> = [
  {
    id: 'readiness',
    label: 'Readiness',
    subtitle: 'Talent readiness and market strength',
    icon: 'rocket_launch',
    accent: 'from-slate-400/18 to-amber-500/20',
  },
  {
    id: 'momentum',
    label: 'Momentum',
    subtitle: 'Candidate responsiveness and movement',
    icon: 'bolt',
    accent: 'from-slate-500/18 to-orange-500/18',
  },
  {
    id: 'experience',
    label: 'Experience',
    subtitle: 'Application journey and drop-off risk',
    icon: 'sentiment_satisfied',
    accent: 'from-slate-500/18 to-rose-500/18',
  },
  {
    id: 'diversity',
    label: 'Diversity',
    subtitle: 'Inclusive talent reach and pipeline health',
    icon: 'diversity_3',
    accent: 'from-slate-400/18 to-amber-400/18',
  },
  {
    id: 'economics',
    label: 'Economics',
    subtitle: 'Hiring economics and operational efficiency',
    icon: 'payments',
    accent: 'from-slate-500/18 to-orange-400/18',
  },
]

export function HomePage({
  onOpenJourney,
  darkMode,
  onToggleDarkMode,
}: {
  onOpenJourney: (clusterId: ClusterId) => void
  darkMode: boolean
  onToggleDarkMode: () => void
}) {
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<ClusterId>('readiness')
  const emiratesGif =
    'https://commons.wikimedia.org/wiki/Special:FilePath/Emirates_77W_wing_view,_July_2015.gif'

  return (
    <div className={cn('relative min-h-dvh overflow-hidden', darkMode ? 'bg-slate-900' : 'bg-white')}>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-cover bg-center [filter:saturate(1.25)_contrast(1.12)_brightness(1.08)]',
          darkMode ? 'opacity-55' : 'opacity-35',
        )}
        style={{ backgroundImage: `url('${emiratesGif}')` }}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          darkMode
            ? 'bg-[radial-gradient(95%_80%_at_0%_0%,rgba(148,163,184,0.18),transparent_55%),radial-gradient(85%_70%_at_100%_0%,rgba(251,146,60,0.12),transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.9))]'
            : 'bg-[radial-gradient(95%_80%_at_0%_0%,rgba(148,163,184,0.08),transparent_55%),radial-gradient(85%_70%_at_100%_0%,rgba(251,146,60,0.06),transparent_60%)]',
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_18%,rgba(255,255,255,0.24),transparent_65%)] mix-blend-screen" />
      <div className="pointer-events-none absolute left-0 right-0 top-[24%] h-[2px] bg-gradient-to-r from-transparent via-orange-400/60 to-transparent">
        <div className="flight-dot h-2 w-2 rounded-full bg-orange-200 shadow-[0_0_20px_rgba(251,146,60,0.85)]" />
      </div>
      <style>{`
        @keyframes flightPath {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(calc(100vw - 24px)); opacity: 0; }
        }
        .flight-dot {
          animation: flightPath 7s linear infinite;
        }
      `}</style>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1320px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="rounded-[26px] border border-white/15 bg-slate-800/55 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate bg-gradient-to-r from-slate-500 via-orange-500 to-slate-500 bg-clip-text text-[38px] font-black tracking-[0.08em] text-transparent drop-shadow-[0_0_16px_rgba(251,146,60,0.45)] sm:text-[50px]">
                FIKRAH
              </div>
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300/90">
                Talent Acquisition Intelligence Cockpit
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-700/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-slate-700/70">
                <Icon name="upload" className="text-[18px]" />
                <span>{loadedFileName ? 'File Loaded' : 'Upload'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0]
                    if (!f) return
                    setLoadedFileName(f.name)
                    e.currentTarget.value = ''
                  }}
                />
              </label>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-700/55 text-slate-100 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-slate-700/70"
                aria-label="Toggle theme"
                title="Theme"
              >
                <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className="text-[20px]" />
              </button>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] border border-white/15 bg-slate-800/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="text-[35px] font-black tracking-tight text-slate-100 sm:text-[48px]">Talent Acquisition Journey</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-slate-700/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Dataset Status</div>
              <div className="mt-2 text-[14px] font-semibold text-slate-100">
                {loadedFileName ? loadedFileName : 'Upload a file to unlock journey sections'}
              </div>
            </div>
          </div>
        </section>

        {loadedFileName ? (
          <main className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {journeyCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCluster(card.id)}
                className={cn(
                  'group relative overflow-hidden rounded-[24px] border border-white/15 bg-slate-800/52 p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.32)] transition',
                  'hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.38)]',
                  selectedCluster === card.id && 'ring-2 ring-[color:var(--ta-primary)]/45',
                )}
                title={`Select ${card.label} journey`}
                aria-label={`Select ${card.label} journey`}
              >
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', card.accent)} />
                <div className="relative">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-700/70 text-orange-200 ring-1 ring-orange-300/35 shadow-[0_0_12px_rgba(251,146,60,0.2)]">
                    <Icon name={card.icon} className="text-[28px]" />
                  </span>
                  <div className="mt-4 text-[20px] font-bold tracking-tight text-slate-100">{card.label}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-slate-300">{card.subtitle}</div>
                </div>
              </button>
            ))}
            </div>

            <section className="mt-5 rounded-[30px] border border-white/15 bg-slate-800/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
              <button
                type="button"
                onClick={() => onOpenJourney(selectedCluster)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-500 via-orange-500 to-slate-500 px-5 py-4 text-[14px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_0_20px_rgba(251,146,60,0.35)] transition hover:brightness-110"
              >
                Launch Cockpit
                <Icon name="arrow_outward" className="text-[18px]" />
              </button>
            </section>
          </main>
        ) : (
          <main className="mt-6 rounded-[24px] border border-dashed border-slate-900/20 bg-white/65 p-8 text-center dark:border-white/20 dark:bg-slate-950/30">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--ta-primary)]/12 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/20">
              <Icon name="flight_takeoff" className="text-[28px]" />
            </div>
            <div className="mt-3 text-[15px] font-semibold text-slate-800 dark:text-slate-100">Upload a file to enable the five journey sections</div>
          </main>
        )}
      </div>
    </div>
  )
}
