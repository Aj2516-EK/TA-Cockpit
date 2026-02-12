import type { Rag } from '../../model'

export type VizCategory = 'percentage' | 'time' | 'count' | 'rating' | 'cost' | 'ratio'

const CATEGORY_MAP: Record<string, VizCategory> = {
  // Percentage (9)
  skill_readiness: 'percentage',
  critical_skill_capability: 'percentage',
  incomplete_applications: 'percentage',
  diverse_attraction: 'percentage',
  diverse_pipeline: 'percentage',
  presented_vs_offers: 'percentage',
  job_posting_effectiveness: 'percentage',
  hires_from_competitors: 'percentage',
  jd_criteria_match: 'percentage',
  // Time (6)
  time_to_present: 'time',
  time_to_next_step: 'time',
  time_to_cv_response: 'time',
  time_spent_matching: 'time',
  time_to_apply: 'time',
  hm_feedback_time: 'time',
  // Count (4)
  qualified_candidates_availability: 'count',
  external_connections: 'count',
  pool_variety: 'count',
  active_applicants: 'count',
  // Rating (2)
  recruiting_experience_rating: 'rating',
  ease_of_applying: 'rating',
  // Cost (1)
  cost_per_acquisition: 'cost',
  // Ratio (1)
  interviewed_vs_offered: 'ratio',
}

/** Extract the short metric name from e.g. "metric.readiness.skill_readiness" */
function shortName(metricId: string): string {
  const parts = metricId.split('.')
  return parts[parts.length - 1]
}

export function getVizCategory(metricId: string): VizCategory | null {
  return CATEGORY_MAP[shortName(metricId)] ?? null
}

export function ragColor(rag: Rag): string {
  switch (rag) {
    case 'red':
      return '#ef4444'
    case 'amber':
      return '#f59e0b'
    case 'green':
      return '#22c55e'
  }
}
