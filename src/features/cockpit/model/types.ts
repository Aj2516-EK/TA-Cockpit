export type Rag = 'red' | 'amber' | 'green'
export type ClusterId = 'readiness' | 'momentum' | 'experience' | 'diversity' | 'economics'

export type ClusterMeta = {
  id: ClusterId
  shortLabel: string
  title: string
  description: string
  colorVar: string
  icon: string
}

export type Metric = {
  id: string
  title: string
  valueText: string
  valueNum?: number
  unit?: string
  thresholdText: string
  rag: Rag
  icon: string
  alarm: string
  insight: string
  action: string
  // Small aggregate facts only (no row-level data). Included in AI context.
  supportingFacts?: string[]
}

export type KeyInsight = {
  metricId: string
  title: string
  text: string
  rag: Rag
  icon: string
}
