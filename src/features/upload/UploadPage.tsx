import { useRef, useState } from 'react'
import { Icon } from '../../ui/Icon'
import { cn } from '../../lib/cn'
import { parseUploadToDataset } from '../cockpit/runtime-data/parse'
import type { Dataset } from '../cockpit/runtime-data/types'

export function UploadPage({
  darkMode,
  onToggleDarkMode,
  onDataReady,
  onBack,
}: {
  darkMode: boolean
  onToggleDarkMode: () => void
  onDataReady: (dataset: Dataset) => void
  onBack: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingLabel, setLoadingLabel] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setIsLoading(true)
    setLoadingLabel(`Parsing ${file.name}...`)
    try {
      const ds = await parseUploadToDataset(file)
      onDataReady(ds)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
      setLoadingLabel('')
    }
  }

  const handleSampleData = async () => {
    setError(null)
    setIsLoading(true)
    setLoadingLabel('Loading sample dataset...')
    try {
      const url = import.meta.env.VITE_SAMPLE_DATA_URL
      if (!url) throw new Error('Sample data URL not configured')
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch sample data (${res.status})`)
      const blob = await res.blob()
      const file = new File([blob], 'sample-data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const ds = await parseUploadToDataset(file)
      onDataReady(ds)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
      setLoadingLabel('')
    }
  }

  return (
    <div className={cn('relative min-h-dvh overflow-hidden', darkMode ? 'bg-slate-900' : 'bg-white')}>
      {/* Background layers — same as landing page */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          darkMode
            ? 'bg-[radial-gradient(95%_80%_at_0%_0%,rgba(148,163,184,0.18),transparent_55%),radial-gradient(85%_70%_at_100%_0%,rgba(251,146,60,0.12),transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.9))]'
            : 'bg-[radial-gradient(95%_80%_at_0%_0%,rgba(148,163,184,0.08),transparent_55%),radial-gradient(85%_70%_at_100%_0%,rgba(251,146,60,0.06),transparent_60%)]',
        )}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[800px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        {/* Header */}
        <header className="rounded-[26px] border border-white/15 bg-slate-800/55 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-700/55 text-slate-100 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-slate-700/70 disabled:opacity-50"
                aria-label="Back to landing"
                title="Back"
              >
                <Icon name="arrow_back" className="text-[20px]" />
              </button>
              <div className="min-w-0">
                <div className="truncate bg-gradient-to-r from-slate-500 via-orange-500 to-slate-500 bg-clip-text text-[28px] font-black tracking-[0.08em] text-transparent drop-shadow-[0_0_16px_rgba(251,146,60,0.45)] sm:text-[36px]">
                  FIKRAH
                </div>
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300/90">
                  Load Your Data
                </div>
              </div>
            </div>

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
        </header>

        {/* Main content */}
        <main className="mt-8 flex flex-1 flex-col items-center justify-center gap-6">
          {/* Error message */}
          {error && (
            <div className="w-full rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-[13px] text-rose-200 shadow-sm">
              {error}
            </div>
          )}

          {/* Loading spinner */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-orange-300/30 border-t-orange-400" />
              <span className="text-[14px] font-semibold text-slate-200">{loadingLabel}</span>
            </div>
          )}

          {/* Upload options — hidden while loading */}
          {!isLoading && (
            <div className="grid w-full gap-5 sm:grid-cols-2">
              {/* Upload file */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative overflow-hidden rounded-[24px] border border-white/15 bg-slate-800/52 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.38)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-400/18 to-amber-500/20" />
                <div className="relative flex flex-col items-center gap-4">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/70 text-orange-200 ring-1 ring-orange-300/35 shadow-[0_0_12px_rgba(251,146,60,0.2)]">
                    <Icon name="upload_file" className="text-[32px]" />
                  </span>
                  <div className="text-[18px] font-bold tracking-tight text-slate-100">Upload Your File</div>
                  <div className="text-[13px] leading-relaxed text-slate-300">
                    .xlsx, .xls, or .csv
                  </div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0]
                  if (!f) return
                  handleFile(f)
                  e.currentTarget.value = ''
                }}
              />

              {/* Load sample data */}
              <button
                type="button"
                onClick={handleSampleData}
                className="group relative overflow-hidden rounded-[24px] border border-white/15 bg-slate-800/52 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.38)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-500/18 to-orange-500/18" />
                <div className="relative flex flex-col items-center gap-4">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/70 text-orange-200 ring-1 ring-orange-300/35 shadow-[0_0_12px_rgba(251,146,60,0.2)]">
                    <Icon name="database" className="text-[32px]" />
                  </span>
                  <div className="text-[18px] font-bold tracking-tight text-slate-100">Load Sample Data</div>
                  <div className="text-[13px] leading-relaxed text-slate-300">
                    Try with our demo dataset
                  </div>
                </div>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
