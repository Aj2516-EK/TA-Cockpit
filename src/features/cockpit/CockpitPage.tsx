import { useEffect, useMemo, useState } from 'react'
import { clusters, metricsByCluster, summarizeKeyInsights, type ClusterId, type Metric } from './model'
import { SidebarNav } from './components/SidebarNav'
import { TopBar } from './components/TopBar'
import { KeyInsightsPanel } from './components/KeyInsightsPanel'
import { MetricsGrid } from './components/MetricsGrid'
import { FiltersDrawer } from './components/FiltersDrawer'
import { ChatWidget } from './components/ChatWidget'
import { ClusterBrief } from './components/ClusterBrief'

export function CockpitPage() {
  const [activeCluster, setActiveCluster] = useState<ClusterId>('readiness')
  const [darkMode, setDarkMode] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const allMetrics = useMemo(() => {
    const out: Metric[] = []
    for (const c of clusters) out.push(...metricsByCluster[c.id])
    return out
  }, [])

  const keyInsights = useMemo(() => summarizeKeyInsights(allMetrics), [allMetrics])

  const currentCluster = clusters.find((c) => c.id === activeCluster)!
  const currentMetrics = metricsByCluster[activeCluster]
  const metricSnapshot = useMemo(
    () => ({
      activeCluster,
      metrics: currentMetrics.map((m) => ({
        id: m.id,
        title: m.title,
        valueText: m.valueText,
        thresholdText: m.thresholdText,
        rag: m.rag,
      })),
    }),
    [activeCluster, currentMetrics],
  )

  const healthScore = useMemo(() => {
    const score = (rag: string) => (rag === 'green' ? 100 : rag === 'amber' ? 70 : 40)
    const values = allMetrics.map((m) => score(m.rag))
    const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
    return Math.round(avg * 10) / 10
  }, [allMetrics])

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
                datasetLabel="No dataset loaded (upload for demo)"
              />

              <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                  <section className="rounded-[24px] border border-slate-900/10 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Active Cluster
                    </div>
                    <div className="mt-1 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
                      {currentCluster.title}
                    </div>
                    <div className="mt-2 text-[13px] font-normal leading-relaxed text-slate-600 dark:text-slate-300">
                      {currentCluster.description}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                        Health Score: <span className="font-bold text-slate-900 dark:text-white">{healthScore}</span>
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        Calculated from RAG status across KPIs
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-4">
                    <KeyInsightsPanel insights={keyInsights} />
                    <ClusterBrief activeCluster={activeCluster} metricSnapshot={metricSnapshot} />
                  </div>
                </div>

                <section className="mt-4">
                  <MetricsGrid
                    metrics={currentMetrics}
                    expanded={expanded}
                    onToggleMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: !s[metricId] }))}
                  />
                </section>
              </main>
            </div>
          </div>
        </div>
      </div>

      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <ChatWidget
        activeCluster={activeCluster}
        metricSnapshot={metricSnapshot}
        onOpenFilters={() => setFiltersOpen(true)}
        onExpandMetric={(metricId) => setExpanded((s) => ({ ...s, [metricId]: true }))}
      />
    </div>
  )
}
