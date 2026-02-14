import { useEffect, useMemo, useRef, useState } from 'react'
import { clusters, computeMetricsByCluster, summarizeKeyInsights, type ClusterId, type Metric } from './model'
import { SidebarNav } from './components/SidebarNav'
import { TopBar } from './components/TopBar'
import { KeyInsightsPanel } from './components/KeyInsightsPanel'
import { MetricsGrid } from './components/MetricsGrid'
import { FiltersDrawer } from './components/FiltersDrawer'
import { ChatWidget } from './components/ChatWidget'
import { ClusterBrief } from './components/ClusterBrief'
import { HealthScoreRing } from './components/HealthScoreRing'
import { DataInspectorDrawer } from './components/DataInspectorDrawer'
import { InsightDrawer } from './components/InsightDrawer'
import type { Dataset, Filters } from './runtime-data/types'
import { parseUploadToDataset } from './runtime-data/parse'
import { applyFilters, deriveFilterOptions, resetFilters } from './runtime-data/filters'
import { computeInsightContext } from './runtime-data/insights'
import { computeAllMetricTrends } from './runtime-data/trends'

export function CockpitPage() {
  const [activeCluster, setActiveCluster] = useState<ClusterId>('readiness')
  const [darkMode, setDarkMode] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dataInspectorOpen, setDataInspectorOpen] = useState(false)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [insightsAutoGenerateArmed, setInsightsAutoGenerateArmed] = useState(false)
  const [contextVersion, setContextVersion] = useState(0)
  const [insightMetricId, setInsightMetricId] = useState<string | null>(null)
  const [insightOpen, setInsightOpen] = useState(false)
  const [pendingScrollMetricId, setPendingScrollMetricId] = useState<string | null>(null)
  const [metricNarratives, setMetricNarratives] = useState<
    Record<string, { alarm: string; insight: string; action: string; source?: string }>
  >({})
  const narrativeReqRef = useRef(0)
  const [metricAssignments, setMetricAssignments] = useState<
    Record<string, { owner: string; note: string; targetDate: string; assignedAt: string }>
  >({})

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ta_metric_assignments')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { owner: string; note: string; targetDate: string; assignedAt: string }>
        setMetricAssignments(parsed)
      }
    } catch {
      // Ignore localStorage hydration failures.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('ta_metric_assignments', JSON.stringify(metricAssignments))
    } catch {
      // Ignore persistence failures.
    }
  }, [metricAssignments])

  const filterOptions = useMemo(() => deriveFilterOptions(dataset?.rows ?? null), [dataset])
  const filteredRows = useMemo(() => {
    if (!dataset) return null
    return applyFilters(dataset.rows, filters)
  }, [dataset, filters])

  const metricsByCluster = useMemo(() => computeMetricsByCluster({ rows: filteredRows }), [filteredRows])

  const allMetrics = useMemo(() => {
    const out: Metric[] = []
    for (const c of clusters) out.push(...metricsByCluster[c.id])
    return out
  }, [metricsByCluster])

  const keyInsights = useMemo(() => summarizeKeyInsights(allMetrics), [allMetrics])

  const currentCluster = clusters.find((c) => c.id === activeCluster)!
  const currentMetrics = metricsByCluster[activeCluster]
  const currentMetricsWithNarratives = useMemo(
    () =>
      currentMetrics.map((m) => (metricNarratives[m.id] ? { ...m, ...metricNarratives[m.id] } : m)),
    [currentMetrics, metricNarratives],
  )
  const currentMetricTrends = useMemo(() => {
    if (!filteredRows || currentMetrics.length === 0) return {}
    return computeAllMetricTrends(
      currentMetrics.map((m) => m.id),
      filteredRows,
    )
  }, [filteredRows, currentMetrics])

  const metricById = useMemo(
    () =>
      new Map(
        allMetrics.map((m) => [m.id, metricNarratives[m.id] ? { ...m, ...metricNarratives[m.id] } : m] as const),
      ),
    [allMetrics, metricNarratives],
  )

  useEffect(() => {
    if (!pendingScrollMetricId) return
    const id = pendingScrollMetricId
    const t = window.setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Only auto-scroll once per user action.
      setPendingScrollMetricId(null)
    }, 60)
    return () => window.clearTimeout(t)
  }, [pendingScrollMetricId, activeCluster, currentMetrics])
  const metricSnapshot = useMemo(
    () => ({
      activeCluster,
      metrics: currentMetrics.map((m) => ({
        id: m.id,
        title: m.title,
        valueText: m.valueText,
        thresholdText: m.thresholdText,
        rag: m.rag,
        supportingFacts: m.supportingFacts ?? [],
      })),
    }),
    [activeCluster, currentMetrics],
  )

  const insightContext = useMemo(
    () =>
      computeInsightContext({
        rows: filteredRows,
        currentMetrics,
        recruiterActivityRows: dataset?.recruiterActivityRows,
      }),
    [filteredRows, currentMetrics, dataset?.recruiterActivityRows],
  )

  const metricsForNarratives = useMemo(
    () =>
      currentMetrics.map((m) => ({
        id: m.id,
        title: m.title,
        valueText: m.valueText,
        thresholdText: m.thresholdText,
        rag: m.rag,
        supportingFacts: m.supportingFacts ?? [],
      })),
    [currentMetrics],
  )

  useEffect(() => {
    if (!dataset || metricsForNarratives.length === 0) {
      setMetricNarratives({})
      return
    }

    const reqId = ++narrativeReqRef.current

    const fallbackNarrative = (metric: (typeof metricsForNarratives)[number]) => {
      const value = metric.valueText.trim().toUpperCase()
      const unavailable = value === 'N/A' || value === '--'
      const gap = unavailable ? 'Value unavailable for the current filter slice.' : `${metric.valueText} vs ${metric.thresholdText}.`
      const alarm =
        metric.rag === 'red'
          ? `${metric.title} is off target. ${gap}`
          : metric.rag === 'amber'
            ? `${metric.title} is near threshold. ${gap}`
            : `${metric.title} is on target. ${gap}`
      const fact = metric.supportingFacts?.[0]
      const insight = unavailable
        ? `Data required for this KPI is missing or filtered out.${fact ? ` Evidence: ${fact}.` : ''}`
        : `Current performance is ${metric.rag}.${fact ? ` Evidence: ${fact}.` : ''}`
      const action =
        unavailable
          ? 'Confirm required columns are present or broaden filters to restore data coverage.'
          : metric.rag === 'red'
            ? 'Assign an owner and run a focused improvement sprint this week.'
            : metric.rag === 'amber'
              ? 'Run one targeted improvement experiment and monitor weekly.'
              : 'Maintain current cadence and monitor for regression.'
      return { alarm, insight, action }
    }

    const run = async () => {
      try {
        const res = await fetch('/api/metric-narratives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: metricsForNarratives,
            filters,
            insightContext,
          }),
        })
        if (!res.ok) throw new Error(`Narratives request failed: ${res.status}`)
        const json = (await res.json()) as {
          items?: Array<{ id: string; alarm: string; insight: string; action: string }>
        }
        if (narrativeReqRef.current !== reqId) return
        const items = json.items ?? []
        const next: Record<string, { alarm: string; insight: string; action: string }> = {}
        for (const item of items) {
          if (!item?.id) continue
          next[item.id] = {
            alarm: item.alarm,
            insight: item.insight,
            action: item.action,
          }
        }
        setMetricNarratives(next)
      } catch (err) {
        if (narrativeReqRef.current !== reqId) return
        const next: Record<string, { alarm: string; insight: string; action: string }> = {}
        for (const metric of metricsForNarratives) {
          next[metric.id] = fallbackNarrative(metric)
        }
        setMetricNarratives(next)
        console.warn('[metric-narratives] fallback after fetch error', err)
      }
    }

    run()
  }, [dataset, metricsForNarratives, filters, insightContext])

  const healthScore = useMemo(() => {
    const score = (rag: string) => (rag === 'green' ? 100 : rag === 'amber' ? 70 : 40)
    const values = allMetrics.filter((m) => typeof m.valueNum === 'number').map((m) => score(m.rag))
    const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
    return Math.round(avg * 10) / 10
  }, [allMetrics])

  const datasetLabel = useMemo(() => {
    if (!dataset) return 'No dataset loaded (upload for demo)'
    const filteredCount = filteredRows?.length ?? dataset.rows.length
    return `Dataset: ${dataset.name} | Rows: ${dataset.rows.length.toLocaleString()} | Filtered: ${filteredCount.toLocaleString()}`
  }, [dataset, filteredRows])

  const handleAssignMetric = (metricId: string, assignment: { owner: string; note: string; targetDate: string; assignedAt: string }) => {
    setMetricAssignments((prev) => ({ ...prev, [metricId]: assignment }))
  }

  const handleClearAssignment = (metricId: string) => {
    setMetricAssignments((prev) => {
      if (!prev[metricId]) return prev
      const next = { ...prev }
      delete next[metricId]
      return next
    })
  }

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-[radial-gradient(90%_80%_at_0%_0%,rgba(33,150,243,0.16),transparent_55%),radial-gradient(85%_70%_at_100%_0%,rgba(103,58,183,0.12),transparent_60%),radial-gradient(70%_80%_at_100%_100%,rgba(233,30,99,0.10),transparent_55%)]">
      <div className="h-full bg-white/70 dark:bg-slate-950/40">
        <div className="grid h-full grid-cols-[auto_1fr]">
          <SidebarNav
            clusters={clusters}
            activeCluster={activeCluster}
            onSelectCluster={(id) => setActiveCluster(id)}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />

          <div className="min-w-0">
            <div className="flex h-dvh min-w-0 flex-col">
              <TopBar
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((v) => !v)}
                onOpenFilters={() => setFiltersOpen(true)}
                datasetLabel={datasetLabel}
                isUploading={isUploading}
                onOpenDataInspector={() => setDataInspectorOpen(true)}
                onUpload={async (file) => {
                  if (isUploading) return
                  setUploadError(null)
                  setIsUploading(true)
                  try {
                    const ds = await parseUploadToDataset(file)
                    setDataset(ds)
                    setFilters(resetFilters())
                    setExpanded({})
                    setContextVersion((v) => v + 1)
                    setInsightsAutoGenerateArmed(true)
                  } catch (e) {
                    setUploadError(e instanceof Error ? e.message : String(e))
                  } finally {
                    setIsUploading(false)
                  }
                }}
              />

              <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                {uploadError && (
                  <section className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-[13px] text-rose-700 shadow-sm dark:text-rose-200">
                    {uploadError}
                  </section>
                )}
                {/* Cluster header — full-width compact strip */}
                <section className="flex flex-col gap-4 rounded-[24px] border border-slate-900/10 bg-white/55 px-5 py-4 shadow-sm sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Active Cluster
                    </div>
                    <div className="mt-1 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
                      {currentCluster.title}
                    </div>
                    <div className="mt-1.5 text-[13px] font-normal leading-relaxed text-slate-600 dark:text-slate-300">
                      {currentCluster.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <HealthScoreRing score={healthScore} />
                    <div className="text-[11px] font-normal leading-relaxed text-slate-500 dark:text-slate-400">
                      Aggregated from RAG<br />status across all KPIs
                    </div>
                  </div>
                </section>

                {/* Insights + AI Brief — side by side */}
                <div className="grid items-start gap-4 xl:grid-cols-2">
                  <KeyInsightsPanel
                    insights={keyInsights}
                    onSelect={(metricId) => {
                      const metric = metricById.get(metricId)
                      if (metric) {
                        const parts = metricId.split('.')
                        const clusterId = parts.length >= 3 ? (parts[1] as ClusterId) : activeCluster
                        setActiveCluster(clusterId)
                        setExpanded((s) => ({ ...s, [metricId]: true }))
                        setPendingScrollMetricId(metricId)
                      }
                      setInsightMetricId(metricId)
                      setInsightOpen(true)
                    }}
                  />
                  <ClusterBrief
                    activeCluster={activeCluster}
                    metricSnapshot={metricSnapshot}
                    filters={filters}
                    insightContext={insightContext}
                    contextVersion={contextVersion}
                    autoGenerateEnabled={insightsAutoGenerateArmed && Boolean(dataset)}
                  />
                </div>

                {/* Metric cards */}
                <MetricsGrid
                  metrics={currentMetricsWithNarratives}
                  expanded={expanded}
                  onToggleMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: !s[metricId] }))}
                  trends={currentMetricTrends}
                  assignments={metricAssignments}
                  onAssignMetric={handleAssignMetric}
                  onClearAssignment={handleClearAssignment}
                />
              </main>
            </div>
          </div>
        </div>
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        disabled={!dataset}
        filters={filters}
        options={filterOptions}
        onChange={(next) => {
          setFilters(next)
          setContextVersion((v) => v + 1)
        }}
        onReset={() => {
          setFilters(resetFilters())
          setContextVersion((v) => v + 1)
        }}
      />
      <DataInspectorDrawer
        open={dataInspectorOpen}
        onClose={() => setDataInspectorOpen(false)}
        dataset={dataset}
        filteredRows={filteredRows}
        filters={filters}
        metricSnapshot={metricSnapshot}
        allMetrics={allMetrics}
      />
      <ChatWidget
        activeCluster={activeCluster}
        metricSnapshot={metricSnapshot}
        insightContext={insightContext}
        filters={filters}
        contextVersion={contextVersion}
        onOpenFilters={() => setFiltersOpen(true)}
        onExpandMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: true }))}
      />

      <InsightDrawer
        open={insightOpen}
        onClose={() => setInsightOpen(false)}
        cluster={
          insightMetricId
            ? clusters.find((c) => c.id === (insightMetricId.split('.')[1] as ClusterId)) ?? null
            : null
        }
        metric={insightMetricId ? metricById.get(insightMetricId) ?? null : null}
      />
    </div>
  )
}
