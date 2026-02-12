import { useMemo } from 'react'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { ApplicationFactRow, Dataset } from '../runtime-data/types'
import type { Metric } from '../model'
import { computeStageDistribution, computeWeeklyTrend } from '../runtime-data/charts'
import type { ReactNode } from 'react'

function fmt(n: number) {
  return n.toLocaleString()
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function filterRowsForMetric(rows: ApplicationFactRow[], metricId: string) {
  switch (metricId) {
    case 'metric.readiness.qualified_candidates_availability':
      return rows.filter(
        (r) =>
          r.criticalSkillFlag === true &&
          isFiniteNumber(r.skillMatchPercentage) &&
          r.skillMatchPercentage >= 80,
      )
    case 'metric.readiness.skill_readiness':
      return rows.filter((r) => isFiniteNumber(r.skillMatchPercentage))
    case 'metric.readiness.external_connections':
      return rows.filter(
        (r) =>
          r.candidateType === 'External' &&
          (((r.recruiterId ?? '').trim().length > 0) || (r.matchingHoursTotal ?? 0) > 0),
      )
    case 'metric.readiness.time_to_present':
    case 'metric.readiness.critical_skill_capability':
      return rows.filter((r) => r.criticalSkillFlag === true)
    case 'metric.readiness.pool_variety':
      return rows

    case 'metric.momentum.time_to_next_step':
      return rows.filter((r) => r.stageEnterDate && r.stageExitDate)
    case 'metric.momentum.time_to_cv_response':
      return rows.filter((r) => isFiniteNumber(r.recruiterResponseTimeHours))
    case 'metric.momentum.time_spent_matching':
      return rows.filter((r) => isFiniteNumber(r.matchingHoursTotal))
    case 'metric.momentum.recruiting_experience_rating':
      return rows.filter((r) => isFiniteNumber(r.candidateNps))

    case 'metric.experience.incomplete_applications':
      return rows.filter((r) => typeof r.applicationCompleted === 'boolean')
    case 'metric.experience.time_to_apply':
      return rows.filter((r) => r.applicationStartTime && r.applicationSubmitTime)
    case 'metric.experience.ease_of_applying':
      return rows.filter((r) => isFiniteNumber(r.applicationEaseRating))

    case 'metric.diversity.diverse_attraction':
      return rows.filter((r) => typeof r.diversityFlag === 'boolean')
    case 'metric.diversity.diverse_pipeline':
      return rows.filter((r) => r.status === 'Hired' && typeof r.diversityFlag === 'boolean')
    case 'metric.diversity.active_applicants':
      return rows.filter((r) => r.status === 'Active')

    case 'metric.economics.cost_per_acquisition':
      return rows.filter((r) => r.status === 'Hired' || isFiniteNumber(r.totalHiringCost))
    case 'metric.economics.presented_vs_offers':
    case 'metric.economics.interviewed_vs_offered':
      return rows.filter((r) => r.interviewDate != null || r.offerMade === true)
    case 'metric.economics.job_posting_effectiveness':
      return rows.filter((r) => isFiniteNumber(r.jobViews) || isFiniteNumber(r.jobApplicationsReceived))
    case 'metric.economics.hires_from_competitors':
      return rows.filter((r) => r.status === 'Hired' && typeof r.isCompetitor === 'boolean')
    case 'metric.economics.hm_feedback_time':
      return rows.filter((r) => r.interviewDate && r.feedbackDate)
    case 'metric.economics.jd_criteria_match':
      return rows.filter((r) => isFiniteNumber(r.skillMatchPercentage))
    default:
      return rows
  }
}

function lensDescription(metricId: string) {
  switch (metricId) {
    case 'metric.readiness.qualified_candidates_availability':
      return 'Rows where critical skill flag is true and skill match >= 80.'
    case 'metric.readiness.skill_readiness':
      return 'Rows with a valid skill match percentage.'
    case 'metric.readiness.external_connections':
      return 'External candidates with recruiter activity or matching hours.'
    case 'metric.readiness.time_to_present':
    case 'metric.readiness.critical_skill_capability':
      return 'Rows marked as critical skill requisitions.'
    case 'metric.momentum.time_to_next_step':
      return 'Rows with stage enter and exit dates.'
    case 'metric.momentum.time_to_cv_response':
      return 'Rows with recruiter response time populated.'
    case 'metric.momentum.time_spent_matching':
      return 'Rows with matching hours recorded.'
    case 'metric.momentum.recruiting_experience_rating':
      return 'Rows with candidate NPS available.'
    case 'metric.experience.incomplete_applications':
      return 'Rows with application completion flag available.'
    case 'metric.experience.time_to_apply':
      return 'Rows with application start and submit timestamps.'
    case 'metric.experience.ease_of_applying':
      return 'Rows with application ease rating available.'
    case 'metric.diversity.diverse_attraction':
      return 'Rows with diversity flag available.'
    case 'metric.diversity.diverse_pipeline':
      return 'Rows where Status = Hired with diversity flag available.'
    case 'metric.diversity.active_applicants':
      return 'Rows where Status = Active.'
    case 'metric.economics.cost_per_acquisition':
      return 'Rows with hires or requisitions that include hiring cost.'
    case 'metric.economics.presented_vs_offers':
    case 'metric.economics.interviewed_vs_offered':
      return 'Rows with interview dates or offers made.'
    case 'metric.economics.job_posting_effectiveness':
      return 'Rows with job posting views/applications present.'
    case 'metric.economics.hires_from_competitors':
      return 'Rows where Status = Hired and competitor flag is available.'
    case 'metric.economics.hm_feedback_time':
      return 'Rows with interview and feedback dates.'
    case 'metric.economics.jd_criteria_match':
      return 'Rows with skill match percentage available.'
    default:
      return 'All rows in the current filter slice.'
  }
}

export function ChartsDrawer({
  open,
  onClose,
  dataset,
  filteredRows,
  focusMetric,
  onClearFocus,
}: {
  open: boolean
  onClose: () => void
  dataset: Dataset | null
  filteredRows: ApplicationFactRow[] | null
  focusMetric?: Metric | null
  onClearFocus?: () => void
}) {
  const rows = filteredRows ?? (dataset?.rows ?? null)
  const focusRows = useMemo(
    () => (rows && focusMetric ? filterRowsForMetric(rows, focusMetric.id) : rows),
    [rows, focusMetric],
  )
  const chartRows = focusRows ?? rows

  const stageDist = useMemo(() => (chartRows ? computeStageDistribution(chartRows) : null), [chartRows])
  const weekly = useMemo(() => (chartRows ? computeWeeklyTrend(chartRows) : null), [chartRows])

  const weeklyPoints = weekly?.points ?? []
  const cappedWeekly = weeklyPoints.length > 24 ? weeklyPoints.slice(-24) : weeklyPoints

  const hires = useMemo(() => {
    if (!chartRows) return 0
    const ids = new Set<string>()
    for (let i = 0; i < chartRows.length; i++) {
      const r = chartRows[i]
      if (r.status !== 'Hired') continue
      ids.add(r.applicationId ?? `row:${i}`)
    }
    return ids.size
  }, [chartRows])

  const applications = stageDist?.totalApplications ?? 0
  const hireRate = applications > 0 ? hires / applications : 0

  const chartDiagnostics = useMemo(() => {
    if (!dataset || !rows || !stageDist || !weekly) return null
    return {
      dataset: {
        name: dataset.name,
        totalRows: dataset.rows.length,
        filteredRows: rows.length,
        loadedAt: dataset.loadedAt.toISOString(),
      },
      funnel: {
        totalApplications: stageDist.totalApplications,
        missingApplicationIdRows: stageDist.missingApplicationIdRows,
        points: stageDist.points,
      },
      weeklyTrend: {
        missingApplicationDateRows: weekly.missingDates,
        points: weekly.points,
      },
    }
  }, [dataset, rows, stageDist, weekly])

  const lensStats = useMemo(() => {
    if (!rows || !focusMetric || !focusRows) return null
    const total = rows.length
    const focused = focusRows.length
    const coverage = total > 0 ? (focused / total) * 100 : 0
    return {
      total,
      focused,
      coverage,
    }
  }, [rows, focusMetric, focusRows])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[57] bg-black/30 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[58] h-dvh w-[520px] max-w-[96vw] border-l border-slate-900/10 bg-white/90 backdrop-blur-xl',
          'dark:border-white/10 dark:bg-slate-950/70',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Charts"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                <Icon name="show_chart" className="text-[20px]" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {focusMetric ? 'Metric Focus' : 'Charts'}
                </div>
                <div className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {focusMetric?.title ?? (dataset ? dataset.name : 'No dataset loaded')}
                </div>
                {focusMetric ? (
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Charts scoped to the selected KPI.</div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {focusMetric && onClearFocus ? (
                <button
                  type="button"
                  onClick={onClearFocus}
                  className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                >
                  Show all charts
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                aria-label="Close charts"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!rows ? (
              <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Upload a dataset to enable charts.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    How To Read
                  </div>
                  <div className="mt-2 space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200">
                    <div>
                      These charts reflect your current <span className="font-semibold">filter selection</span>.
                    </div>
                    <div>
                      Counts are based on <span className="font-semibold">unique applications</span> (`Application_ID`)
                      where present.
                    </div>
                    <div>
                      “Hires” means <span className="font-semibold">Status = Hired</span> (from the pipeline sheet).
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <Stat label="Applications" value={fmt(applications)} />
                    <Stat label="Hires" value={fmt(hires)} />
                    <Stat label="Hire rate" value={applications > 0 ? pct(hireRate) : 'N/A'} />
                    <Stat
                      label="Weekly points"
                      value={weeklyPoints.length ? fmt(weeklyPoints.length) : '0'}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <Stat
                      label="Missing Application_ID"
                      value={stageDist ? fmt(stageDist.missingApplicationIdRows) : '0'}
                    />
                    <Stat
                      label="Missing Application_Date"
                      value={weekly ? fmt(weekly.missingDates) : '0'}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!chartDiagnostics) return
                        await navigator.clipboard.writeText(JSON.stringify(chartDiagnostics, null, 2))
                      }}
                      disabled={!chartDiagnostics}
                      className={cn(
                        'rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider ring-1 transition',
                        chartDiagnostics
                          ? 'bg-slate-900/5 text-slate-700 ring-slate-900/10 hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7'
                          : 'cursor-not-allowed bg-slate-900/5 text-slate-400 ring-slate-900/10 dark:bg-white/5 dark:text-slate-500 dark:ring-white/10',
                      )}
                    >
                      Copy chart diagnostics JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!chartDiagnostics || !dataset) return
                        const text = JSON.stringify(chartDiagnostics, null, 2)
                        const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${dataset.name}.charts.diagnostics.json`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        URL.revokeObjectURL(url)
                      }}
                      disabled={!chartDiagnostics}
                      className={cn(
                        'rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider ring-1 transition',
                        chartDiagnostics
                          ? 'bg-[color:var(--ta-primary)] text-white ring-[color:var(--ta-primary)]/25 hover:brightness-110 active:scale-[0.98]'
                          : 'cursor-not-allowed bg-[color:var(--ta-primary)]/40 text-white/70 ring-[color:var(--ta-primary)]/15',
                      )}
                    >
                      Download chart diagnostics
                    </button>
                  </div>
                </div>

                {focusMetric && lensStats ? (
                  <Section title="Metric Lens Coverage">
                    <Card>
                      <div className="text-[12px] text-slate-600 dark:text-slate-300">
                        This view filters charts to rows relevant to <span className="font-semibold">{focusMetric.title}</span>.
                      </div>
                      <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                        Lens rule: {lensDescription(focusMetric.id)}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                        <Stat label="Lens rows" value={fmt(lensStats.focused)} />
                        <Stat label="Total rows" value={fmt(lensStats.total)} />
                        <Stat label="Coverage" value={`${lensStats.coverage.toFixed(1)}%`} />
                        <Stat label="Cluster" value={focusMetric.id.split('.')[1] ?? '—'} />
                      </div>
                    </Card>
                  </Section>
                ) : null}

                <Section title="Funnel: Current Stage Distribution">
                  <Card>
                    <div className="text-[12px] text-slate-600 dark:text-slate-300">
                      Definition: how many applications are currently sitting in each pipeline stage (snapshot, not a
                      historical stage-by-stage flow).
                    </div>
                    <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                      Interpretation: a large “Screen”/“Interview” band suggests operational backlog; a large “Rejected”
                      band suggests screening/selection friction; “Hired” shows realized output.
                    </div>

                    <div className="mt-4 space-y-2">
                      {(stageDist?.points ?? []).length === 0 ? (
                        <div className="text-[12px] text-slate-500 dark:text-slate-400">No stage data.</div>
                      ) : (
                        (stageDist?.points ?? []).slice(0, 12).map((p) => (
                          <BarRow
                            key={p.stage}
                            label={p.stage}
                            value={p.applications}
                            max={Math.max(...(stageDist?.points ?? []).map((x) => x.applications), 1)}
                          />
                        ))
                      )}
                      {(stageDist?.points ?? []).length > 12 && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Showing top 12 stages</div>
                      )}
                    </div>
                  </Card>
                </Section>

                <Section title="Weekly Trend: Applications vs Hires">
                  <Card>
                    <div className="text-[12px] text-slate-600 dark:text-slate-300">
                      Definition: weekly unique applications (by Application_Date) vs weekly hires (Status = Hired).
                    </div>
                    <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                      Interpretation: apps flat but hires falling suggests conversion issues; both falling suggests top of
                      funnel weakness; hires lagging apps can indicate downstream SLA bottlenecks.
                    </div>

                    {cappedWeekly.length === 0 ? (
                      <div className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">No dated rows.</div>
                    ) : (
                      <>
                        <LineChart points={cappedWeekly} />
                        {weeklyPoints.length > 24 && (
                          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            Showing last 24 weeks
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </Section>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {title}
      </div>
      {children}
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const w = Math.round((value / Math.max(max, 1)) * 100)
  return (
    <div className="grid grid-cols-[140px_1fr_72px] items-center gap-3">
      <div className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</div>
      <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
        <div
          className="h-full rounded-full bg-[color:var(--ta-primary)]/70"
          style={{ width: `${w}%` }}
        />
      </div>
      <div className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-200">{fmt(value)}</div>
    </div>
  )
}

function LineChart({ points }: { points: Array<{ weekStart: string; applications: number; hires: number }> }) {
  const width = 460
  const height = 180
  const pad = 18

  const maxY = Math.max(1, ...points.map((p) => Math.max(p.applications, p.hires)))

  const x = (i: number) => {
    const span = Math.max(points.length - 1, 1)
    return pad + (i / span) * (width - pad * 2)
  }

  const y = (v: number) => {
    const t = v / maxY
    return height - pad - t * (height - pad * 2)
  }

  const poly = (get: (p: (typeof points)[number]) => number) =>
    points.map((p, i) => `${x(i).toFixed(2)},${y(get(p)).toFixed(2)}`).join(' ')

  const appsPoly = poly((p) => p.applications)
  const hiresPoly = poly((p) => p.hires)

  const last = points[points.length - 1]
  const first = points[0]

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <LegendDot color="rgba(33,150,243,0.85)" label="Applications" />
          <LegendDot color="rgba(16,185,129,0.85)" label="Hires" />
        </div>
        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {first.weekStart} → {last.weekStart}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 w-full overflow-visible"
        role="img"
        aria-label="Weekly applications vs hires"
      >
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="currentColor" opacity={0.12} />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" opacity={0.12} />

        <polyline fill="none" stroke="rgba(33,150,243,0.85)" strokeWidth="2.5" points={appsPoly} />
        <polyline fill="none" stroke="rgba(16,185,129,0.85)" strokeWidth="2.5" points={hiresPoly} />

        <circle cx={x(points.length - 1)} cy={y(last.applications)} r="3.5" fill="rgba(33,150,243,0.85)" />
        <circle cx={x(points.length - 1)} cy={y(last.hires)} r="3.5" fill="rgba(16,185,129,0.85)" />
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <Stat label="Latest week apps" value={fmt(last.applications)} />
        <Stat label="Latest week hires" value={fmt(last.hires)} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-semibold">{label}</span>
    </div>
  )
}
