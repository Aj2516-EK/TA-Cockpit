import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { FilterOptions, Filters } from '../runtime-data/types'
import { useMemo, useState, type ReactNode } from 'react'

export function FiltersDrawer({
  open,
  onClose,
  disabled,
  filters,
  options,
  onChange,
  onReset,
}: {
  open: boolean
  onClose: () => void
  disabled: boolean
  filters: Filters
  options: FilterOptions
  onChange: (next: Filters) => void
  onReset: () => void
}) {
  function toggleMulti(key: keyof Filters, value: string) {
    const cur = (filters[key] as string[] | undefined) ?? []
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    onChange({ ...filters, [key]: next.length ? next : undefined })
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[62] bg-black/30 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[63] h-dvh w-full border-l border-slate-900/10 bg-white/85 backdrop-blur-xl sm:w-[360px] sm:max-w-[92vw]',
          'dark:border-white/10 dark:bg-slate-950/85',
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
            {disabled ? (
              <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] font-normal text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Upload a dataset to enable filters.
                <div className="mt-2 text-[12px] font-normal text-slate-500 dark:text-slate-400">
                  Supported: `.xlsx` (multi-sheet cockpit workbook) or `.csv` (canonical fact rows).
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                  <Field label="Date from">
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
                      className="w-full rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--ta-primary)]/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </Field>
                  <Field label="Date to">
                    <input
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
                      className="w-full rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--ta-primary)]/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </Field>
                </div>

                <MultiChips
                  label="Business unit"
                  values={options.businessUnit}
                  selected={filters.businessUnit ?? []}
                  onToggle={(v) => toggleMulti('businessUnit', v)}
                />
                <MultiChips
                  label="Location"
                  values={options.location}
                  selected={filters.location ?? []}
                  onToggle={(v) => toggleMulti('location', v)}
                />
                <MultiChips
                  label="Role"
                  values={options.roleName}
                  selected={filters.roleName ?? []}
                  onToggle={(v) => toggleMulti('roleName', v)}
                />

                <MultiChips
                  label="Candidate type"
                  values={options.candidateType}
                  selected={filters.candidateType ?? []}
                  onToggle={(v) => toggleMulti('candidateType', v)}
                />
                <MultiChips
                  label="Source"
                  values={options.source}
                  selected={filters.source ?? []}
                  onToggle={(v) => toggleMulti('source', v)}
                />
                <MultiChips
                  label="Gender"
                  values={options.diversityFlag}
                  selected={filters.diversityFlag ?? []}
                  onToggle={(v) => toggleMulti('diversityFlag', v)}
                />
                <MultiChips
                  label="Status"
                  values={options.status}
                  selected={filters.status ?? []}
                  onToggle={(v) => toggleMulti('status', v)}
                />
                <MultiChips
                  label="Recruiter"
                  values={options.recruiterId}
                  selected={filters.recruiterId ?? []}
                  onToggle={(v) => toggleMulti('recruiterId', v)}
                />
              </div>
            )}
          </div>

          <div className="border-t border-slate-900/10 p-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="flex-1 rounded-2xl bg-slate-900/5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {children}
    </label>
  )
}

function MultiChips({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string
  values: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredValues = useMemo(
    () =>
      normalizedQuery.length === 0
        ? values
        : values.filter((v) => v.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery, values],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label}
        </div>
        {selected.length > 0 && (
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{selected.length} selected</div>
        )}
      </div>
      {values.length > 8 && (
        <div className="mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-[12px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--ta-primary)]/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
            aria-label={`Search ${label}`}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-[12px] text-slate-500 dark:text-slate-400">No values</span>
        ) : filteredValues.length === 0 ? (
          <span className="text-[12px] text-slate-500 dark:text-slate-400">No matches</span>
        ) : (
          filteredValues.map((v) => {
            const active = selected.includes(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(v)}
                className={cn(
                  'rounded-2xl px-3 py-1.5 text-[12px] font-semibold',
                  active
                    ? 'bg-[color:var(--ta-primary)]/15 text-[color:var(--ta-primary)] ring-1 ring-[color:var(--ta-primary)]/25'
                    : 'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7',
                )}
              >
                {v}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
