export type RagDoc = {
  id: string
  title: string
  cluster: 'readiness' | 'momentum' | 'experience' | 'diversity' | 'economics' | 'global'
  text: string
  tags?: string[]
}

// MVP: small, high-signal corpus. Later we embed these docs and retrieve via vector similarity.
export const RAG_DOCS: RagDoc[] = [
  {
    id: 'global.alarm_narratives',
    title: 'Alarm Narrative Patterns',
    cluster: 'global',
    tags: ['alarm', 'narratives', 'benchmarks'],
    text:
      'Write decision-ready alarm narratives grounded in the provided KPI snapshot only. ' +
      'Prefer: benchmark deltas, trend direction, and impact. ' +
      'If a number is missing from the snapshot, say it is unavailable rather than guessing.',
  },
  {
    id: 'global.grounding_rules',
    title: 'Grounding Rules',
    cluster: 'global',
    tags: ['grounding', 'non-hallucination'],
    text:
      'Never invent KPI values. Use only the numeric facts provided in metricSnapshot. ' +
      'If asked for a metric not present, explain what data would be needed and how it would be computed.',
  },

  // Readiness
  {
    id: 'metric.readiness.qualified_candidates_availability',
    title: 'Qualified Candidates Availability',
    cluster: 'readiness',
    tags: ['supply', 'readiness'],
    text:
      'Definition: qualified candidates available relative to active requisition demand. ' +
      'Formula: qualified_pool_count / open_requisition_count. ' +
      'Interpretation: low values indicate supply risk; actions focus on sourcing and intake discipline.',
  },
  {
    id: 'metric.readiness.critical_skill_capability',
    title: 'Critical Skill Hiring Capability',
    cluster: 'readiness',
    tags: ['critical', 'capability'],
    text:
      'Definition: ability to consistently deliver hires for critical-skill requisitions within agreed SLAs. ' +
      'Interpretation: when red, fast-track critical reqs, tighten intake, and allocate specialist sourcers.',
  },

  // Momentum
  {
    id: 'metric.momentum.time_to_next_step',
    title: 'Time to Next Step Decision',
    cluster: 'momentum',
    tags: ['sla', 'throughput'],
    text:
      'Definition: average time from stage completion to decision for next step. ' +
      'Interpretation: rising values correlate with candidate drop-off and lower offer acceptance.',
  },

  // Experience
  {
    id: 'metric.experience.incomplete_applications',
    title: 'Incomplete Applications',
    cluster: 'experience',
    tags: ['conversion', 'dropoff'],
    text:
      'Definition: % of applications that do not reach submitted/completed status. ' +
      'Interpretation: high values usually indicate mobile friction, long forms, or upload issues.',
  },

  // Diversity
  {
    id: 'metric.diversity.diverse_pipeline',
    title: 'Diverse Talent Pipeline',
    cluster: 'diversity',
    tags: ['parity', 'pipeline'],
    text:
      'Definition: representation of diverse candidates at key funnel stages, and parity of progression. ' +
      'Interpretation: if late-stage parity is low, focus on panel consistency, scheduling, and feedback SLAs.',
  },

  // Economics
  {
    id: 'metric.economics.cost_per_acquisition',
    title: 'Cost per Acquisition',
    cluster: 'economics',
    tags: ['cost', 'efficiency'],
    text:
      'Definition: total hiring cost divided by hires for the selected scope. ' +
      'Interpretation: when above threshold, shift away from high-cost channels and reduce agency dependency.',
  },
]

