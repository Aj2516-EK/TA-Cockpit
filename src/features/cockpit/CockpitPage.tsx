import { useEffect, useMemo, useState } from 'react'
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
import { ChartsDrawer } from './components/ChartsDrawer'
import { InsightDrawer } from './components/InsightDrawer'
import type { Dataset, Filters } from './runtime-data/types'
import { parseUploadToDataset } from './runtime-data/parse'
import { applyFilters, deriveFilterOptions, resetFilters } from './runtime-data/filters'

export function CockpitPage() {
  const [activeCluster, setActiveCluster] = useState<ClusterId>('readiness')
  const [darkMode, setDarkMode] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dataInspectorOpen, setDataInspectorOpen] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(false)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [contextVersion, setContextVersion] = useState(0)
  const [insightMetricId, setInsightMetricId] = useState<string | null>(null)
  const [insightOpen, setInsightOpen] = useState(false)
  const [pendingScrollMetricId, setPendingScrollMetricId] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

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
  const metricById = useMemo(() => new Map(allMetrics.map((m) => [m.id, m] as const)), [allMetrics])

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
                onOpenDataInspector={() => setDataInspectorOpen(true)}
                onOpenCharts={() => setChartsOpen(true)}
                onUpload={async (file) => {
                  setUploadError(null)
                  try {
                    const ds = await parseUploadToDataset(file)
                    setDataset(ds)
                    setFilters(resetFilters())
                    setExpanded({})
                    setContextVersion((v) => v + 1)
                  } catch (e) {
                    setUploadError(e instanceof Error ? e.message : String(e))
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
                  <ClusterBrief activeCluster={activeCluster} metricSnapshot={metricSnapshot} filters={filters} />
                </div>

                {/* Metric cards */}
                <MetricsGrid
                  metrics={currentMetrics}
                  expanded={expanded}
                  onToggleMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: !s[metricId] }))}
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
      <ChartsDrawer
        open={chartsOpen}
        onClose={() => setChartsOpen(false)}
        dataset={dataset}
        filteredRows={filteredRows}
      />
      <ChatWidget
        activeCluster={activeCluster}
        metricSnapshot={metricSnapshot}
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
