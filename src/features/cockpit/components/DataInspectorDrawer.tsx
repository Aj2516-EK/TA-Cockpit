import Papa from 'papaparse'
import { cn } from '../../../lib/cn'
import { Icon } from '../../../ui/Icon'
import type { Metric } from '../model'
import type { ApplicationFactRow, Dataset, Filters } from '../runtime-data/types'
import type { ReactNode } from 'react'

const AED_FORMATTER = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
})

function fmtAed(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return AED_FORMATTER.format(value)
}

function toIso(v: unknown): string | number | boolean | null {
  if (v == null) return null
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.toISOString() : null
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v
  return String(v)
}

function formatRowForPreview(row: ApplicationFactRow): Record<string, unknown> {
  return {
    ...row,
    budgetedCost: fmtAed(row.budgetedCost),
    totalHiringCost: fmtAed(row.totalHiringCost),
  }
}

function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function rowsToCsv(rows: ApplicationFactRow[]) {
  // Stable column order (matches type roughly).
  const mapped = rows.map((r) => ({
    applicationId: toIso(r.applicationId),
    candidateId: toIso(r.candidateId),
    requisitionId: toIso(r.requisitionId),

    applicationDate: toIso(r.applicationDate),
    currentStage: toIso(r.currentStage),
    stageEnterDate: toIso(r.stageEnterDate),
    stageExitDate: toIso(r.stageExitDate),
    status: toIso(r.status),
    cvSubmissionTimeHours: toIso(r.cvSubmissionTimeHours),
    recruiterResponseTimeHours: toIso(r.recruiterResponseTimeHours),

    source: toIso(r.source),
    candidateType: toIso(r.candidateType),
    diversityFlag: toIso(r.diversityFlag),
    isCompetitor: toIso(r.isCompetitor),
    applicationStartTime: toIso(r.applicationStartTime),
    applicationSubmitTime: toIso(r.applicationSubmitTime),
    applicationCompleted: toIso(r.applicationCompleted),
    applicationEaseRating: toIso(r.applicationEaseRating),
    candidateNps: toIso(r.candidateNps),
    skillMatchPercentage: toIso(r.skillMatchPercentage),

    roleName: toIso(r.roleName),
    businessUnit: toIso(r.businessUnit),
    location: toIso(r.location),
    criticalSkillFlag: toIso(r.criticalSkillFlag),
    requisitionOpenDate: toIso(r.requisitionOpenDate),
    requisitionCloseDate: toIso(r.requisitionCloseDate),
    budgetedCost: toIso(r.budgetedCost),

    recruiterId: toIso(r.recruiterId),
    matchingHoursTotal: toIso(r.matchingHoursTotal),

    interviewDate: toIso(r.interviewDate),
    feedbackDate: toIso(r.feedbackDate),
    offerDate: toIso(r.offerDate),
    offerMade: toIso(r.offerMade),
    offerAccepted: toIso(r.offerAccepted),

    totalHiringCost: toIso(r.totalHiringCost),
    jobViews: toIso(r.jobViews),
    jobApplicationsReceived: toIso(r.jobApplicationsReceived),
  }))

  return Papa.unparse(mapped, { quotes: true })
}

export function DataInspectorDrawer({
  open,
  onClose,
  dataset,
  filteredRows,
  filters,
  metricSnapshot,
  allMetrics,
}: {
  open: boolean
  onClose: () => void
  dataset: Dataset | null
  filteredRows: ApplicationFactRow[] | null
  filters: Filters
  metricSnapshot: unknown
  allMetrics: Metric[]
}) {
  const filteredCount = filteredRows?.length ?? 0
  const totalCount = dataset?.rows.length ?? 0

  const naMetrics = allMetrics.filter((m) => m.valueText === 'N/A' || typeof m.valueNum !== 'number')
  const previewRows = (filteredRows ?? dataset?.rows ?? []).slice(0, 25).map(formatRowForPreview)

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
          'fixed right-0 top-0 z-[63] h-dvh w-full border-l border-slate-900/10 bg-white/90 backdrop-blur-xl sm:w-[520px] sm:max-w-[96vw]',
          'dark:border-white/10 dark:bg-slate-950/85',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Data inspector"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                <Icon name="dataset" className="text-[20px]" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Data Inspector
                </div>
                <div className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {dataset ? dataset.name : 'No dataset loaded'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
              aria-label="Close data inspector"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!dataset ? (
              <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Upload an `.xlsx` or `.csv` to inspect parsing, joins, and computed KPI inputs.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[20px] border border-slate-900/10 bg-white/60 p-4 text-[13px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Dataset
                      </div>
                      <div className="mt-1 font-semibold">
                        Rows: {totalCount.toLocaleString()} | Filtered: {filteredCount.toLocaleString()}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                        Loaded at: {dataset.loadedAt.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadText(`${dataset.name}.normalized.csv`, rowsToCsv(dataset.rows), 'text/csv')}
                        className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                      >
                        Download normalized CSV
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadText(
                            `${dataset.name}.filtered.csv`,
                            rowsToCsv(filteredRows ?? dataset.rows),
                            'text/csv',
                          )
                        }
                        className="rounded-2xl bg-[color:var(--ta-primary)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-[0.98]"
                      >
                        Download filtered CSV
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const payload = {
                          dataset: {
                            name: dataset.name,
                            loadedAt: dataset.loadedAt.toISOString(),
                            rowCount: dataset.rows.length,
                            diagnostics: dataset.diagnostics ?? null,
                          },
                          filters,
                          metricSnapshot,
                          naMetricCount: naMetrics.length,
                        }
                        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
                      }}
                      className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                    >
                      Copy diagnostics JSON
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          `${dataset.name}.diagnostics.json`,
                          JSON.stringify(
                            {
                              dataset: {
                                name: dataset.name,
                                loadedAt: dataset.loadedAt.toISOString(),
                                rowCount: dataset.rows.length,
                                diagnostics: dataset.diagnostics ?? null,
                              },
                              filters,
                              metricSnapshot,
                            },
                            null,
                            2,
                          ),
                          'application/json',
                        )
                      }
                      className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/7"
                    >
                      Download diagnostics JSON
                    </button>
                  </div>
                </div>

                <Section title="Parse Diagnostics">
                  <div className="space-y-2 text-[13px]">
                    <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold">Joins (coverage)</div>
                      {dataset.diagnostics?.joins ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-slate-700 dark:text-slate-200">
                          <KV k="Fact rows" v={String(dataset.diagnostics.joins.factRows)} />
                          <KV k="Candidate joined" v={String(dataset.diagnostics.joins.withCandidate)} />
                          {typeof dataset.diagnostics.joins.missingCandidateRefs === 'number' && (
                            <KV k="Missing candidate refs" v={String(dataset.diagnostics.joins.missingCandidateRefs)} />
                          )}
                          <KV k="Requisition joined" v={String(dataset.diagnostics.joins.withRequisition)} />
                          {typeof dataset.diagnostics.joins.missingRequisitionRefs === 'number' && (
                            <KV k="Missing requisition refs" v={String(dataset.diagnostics.joins.missingRequisitionRefs)} />
                          )}
                          <KV k="Cost joined" v={String(dataset.diagnostics.joins.withCost)} />
                          <KV k="Posting joined" v={String(dataset.diagnostics.joins.withPosting)} />
                          <KV k="Recruiter activity joined" v={String(dataset.diagnostics.joins.withRecruiterActivity)} />
                          <KV k="Interview/offer joined" v={String(dataset.diagnostics.joins.withInterviewOffer)} />
                        </div>
                      ) : (
                        <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">No join diagnostics.</div>
                      )}
                    </div>

                    {(dataset.diagnostics?.samples?.missingCandidateIds?.length ?? 0) > 0 && (
                      <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="font-semibold">Missing Candidate_ID samples</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {dataset.diagnostics!.samples!.missingCandidateIds!.map((id) => (
                            <span
                              key={id}
                              className="rounded-xl bg-black/5 px-2 py-1 text-[11px] font-mono text-slate-800 dark:bg-white/5 dark:text-slate-200"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          This means pipeline rows reference candidates not present in `2_Candidate` (synthetic data issue).
                        </div>
                      </div>
                    )}

                    <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold">Warnings</div>
                      <div className="mt-2 text-[12px] text-slate-700 dark:text-slate-200">
                        {(dataset.diagnostics?.warnings?.length ?? 0) > 0 ? (
                          <ul className="list-disc pl-5">
                            {dataset.diagnostics!.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-500 dark:text-slate-400">None</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold">Sheets</div>
                      <div className="mt-2 space-y-1 text-[12px] text-slate-700 dark:text-slate-200">
                        {(dataset.diagnostics?.sheets ?? []).map((s) => (
                          <div key={s.name} className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[12px]">{s.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {s.rowCount.toLocaleString()} rows | {s.columns.length} cols
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="N/A KPIs">
                  <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 text-[12px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    N/A count: <span className="font-semibold">{naMetrics.length}</span>
                    <div className="mt-2 space-y-2">
                      {naMetrics.slice(0, 30).map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-900/10 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5">
                          <div className="font-semibold">{m.title}</div>
                          <div className="text-slate-500 dark:text-slate-400 font-mono">{m.id}</div>
                          {(m.supportingFacts ?? []).length > 0 && (
                            <div className="mt-1 text-slate-600 dark:text-slate-300">
                              {(m.supportingFacts ?? []).join(' | ')}
                            </div>
                          )}
                        </div>
                      ))}
                      {naMetrics.length > 30 && (
                        <div className="text-slate-500 dark:text-slate-400">Showing first 30</div>
                      )}
                    </div>
                  </div>
                </Section>

                <Section title="Row Preview (first 25)">
                  <div className="rounded-[16px] border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Filtered rows</div>
                    <pre className="max-h-[260px] overflow-auto rounded-xl bg-black/5 p-3 text-[11px] text-slate-800 dark:bg-white/5 dark:text-slate-200">
{JSON.stringify(previewRows, null, 2)}
                    </pre>
                  </div>
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

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  )
}
