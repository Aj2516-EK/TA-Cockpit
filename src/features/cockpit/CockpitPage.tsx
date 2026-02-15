import { useEffect, useMemo, useRef, useState } from 'react'
import { clusters, computeMetricsByCluster, type ClusterId, type Metric } from './model'
import { SidebarNav } from './components/SidebarNav'
import { TopBar } from './components/TopBar'
import { MetricsGrid } from './components/MetricsGrid'
import { FiltersDrawer } from './components/FiltersDrawer'
import { ChatWidget } from './components/ChatWidget'
import { ClusterBrief } from './components/ClusterBrief'
import { HealthScoreRing } from './components/HealthScoreRing'
import { DataInspectorDrawer } from './components/DataInspectorDrawer'
import { InsightDrawer } from './components/InsightDrawer'
import type { Dataset, Filters } from './runtime-data/types'
import { applyFilters, deriveFilterOptions, resetFilters } from './runtime-data/filters'
import { computeInsightContext } from './runtime-data/insights'
import { computeAllMetricTrends } from './runtime-data/trends'
import { loadAssignments, saveAssignments, type AssignmentMap, type MetricAssignment } from './runtime-data/assignments'

export function CockpitPage({
  initialCluster = 'readiness',
  onNavigateHome,
  darkMode,
  onToggleDarkMode,
  dataset,
}: {
  initialCluster?: ClusterId
  onNavigateHome?: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  dataset: Dataset
}) {
  const [activeCluster, setActiveCluster] = useState<ClusterId>(initialCluster)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dataInspectorOpen, setDataInspectorOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({})
  const [contextVersion, setContextVersion] = useState(0)
  const [insightMetricId] = useState<string | null>(null)
  const [insightOpen, setInsightOpen] = useState(false)
  const [pendingScrollMetricId, setPendingScrollMetricId] = useState<string | null>(null)
  const [metricNarratives, setMetricNarratives] = useState<
    Record<string, { alarm: string; insight: string; action: string; source?: string }>
  >({})
  const narrativeReqRef = useRef(0)
  const [metricAssignments, setMetricAssignments] = useState<AssignmentMap>({})

  useEffect(() => {
    setMetricAssignments(loadAssignments())
  }, [])

  useEffect(() => {
    saveAssignments(metricAssignments)
  }, [metricAssignments])

  const filterOptions = useMemo(() => deriveFilterOptions(dataset.rows), [dataset])
  const filteredRows = useMemo(() => applyFilters(dataset.rows, filters), [dataset, filters])

  const metricsByCluster = useMemo(() => computeMetricsByCluster({ rows: filteredRows }), [filteredRows])

  const allMetrics = useMemo(() => {
    const out: Metric[] = []
    for (const c of clusters) out.push(...metricsByCluster[c.id])
    return out
  }, [metricsByCluster])

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
        recruiterActivityRows: dataset.recruiterActivityRows,
      }),
    [filteredRows, currentMetrics, dataset.recruiterActivityRows],
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
    if (metricsForNarratives.length === 0) {
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
    const filteredCount = filteredRows.length
    return `Dataset: ${dataset.name} | Rows: ${dataset.rows.length.toLocaleString()} | Filtered: ${filteredCount.toLocaleString()}`
  }, [dataset, filteredRows])

  const handleAssignMetric = (metricId: string, assignment: MetricAssignment) => {
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
      <div className="h-full bg-white dark:bg-slate-950/40">
        <div className="grid h-full grid-cols-[auto_1fr]">
          <SidebarNav
            clusters={clusters}
            activeCluster={activeCluster}
            onSelectCluster={(id) => setActiveCluster(id)}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
            onNavigateHome={onNavigateHome}
          />

          <div className="min-w-0">
            <div className="flex h-dvh min-w-0 flex-col">
              <TopBar
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
                onOpenFilters={() => setFiltersOpen(true)}
                datasetLabel={datasetLabel}
                onOpenDataInspector={() => setDataInspectorOpen(true)}
              />

              <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                {/* Cluster header — full-width compact strip */}
                <section className="flex flex-col gap-4 rounded-[24px] border border-white/20 bg-gradient-to-r from-slate-500 via-orange-500 to-slate-500 px-5 py-4 shadow-[0_0_20px_rgba(251,146,60,0.35)] sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="text-[24px] font-extrabold tracking-tight text-white sm:text-[30px]">
                      {currentCluster.title}
                    </div>
                    <div className="mt-2 text-[16px] font-medium leading-relaxed text-white/95 sm:text-[18px]">
                      {currentCluster.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <HealthScoreRing score={healthScore} />
                    <div className="text-[13px] font-medium leading-relaxed text-white/90">
                      Aggregated from RAG<br />status across all KPIs
                    </div>
                  </div>
                </section>

                {/* AI Brief */}
                <div className="grid items-start gap-4">
                  <ClusterBrief
                    activeCluster={activeCluster}
                    metricSnapshot={metricSnapshot}
                    filters={filters}
                    insightContext={insightContext}
                    contextVersion={contextVersion}
                    autoGenerateEnabled
                  />
                </div>

                {/* Metric cards */}
                <MetricsGrid
                  metrics={currentMetricsWithNarratives}
                  expanded={expanded}
                  onToggleMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: !s[metricId] }))}
                  trends={currentMetricTrends}
                  filteredRows={filteredRows}
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
        disabled={false}
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
        metricTrends={currentMetricTrends}
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
