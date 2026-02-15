import type { ApplicationFactRow } from './types'

/**
 * Dimension keys that can be used for metric breakdowns.
 * Each must be a string-valued field on ApplicationFactRow.
 */
export type BreakdownDimensionKey = Extract<
  keyof ApplicationFactRow,
  | 'businessUnit'
  | 'location'
  | 'roleName'
  | 'source'
  | 'recruiterId'
  | 'candidateType'
  | 'currentStage'
  | 'status'
>

/** Human-readable labels for each dimension key. */
export const DIMENSION_LABELS: Record<BreakdownDimensionKey, string> = {
  businessUnit: 'Business Unit',
  location: 'Location',
  roleName: 'Role',
  source: 'Source',
  recruiterId: 'Recruiter',
  candidateType: 'Candidate Type',
  currentStage: 'Pipeline Stage',
  status: 'Status',
}

/**
 * Priority-ordered dimension lists per metric.
 * At render time the first 3 dimensions that have >= 2 distinct values in the
 * filtered rows are shown.
 */
export const METRIC_BREAKDOWN_DIMENSIONS: Record<string, BreakdownDimensionKey[]> = {
  // --- Readiness ---
  'metric.readiness.qualified_candidates_availability': ['businessUnit', 'location', 'roleName', 'source', 'recruiterId'],
  'metric.readiness.skill_readiness': ['businessUnit', 'roleName', 'location', 'source', 'candidateType'],
  'metric.readiness.external_connections': ['source', 'location', 'businessUnit', 'recruiterId', 'roleName'],
  'metric.readiness.time_to_present': ['businessUnit', 'location', 'roleName', 'recruiterId', 'source'],
  'metric.readiness.critical_skill_capability': ['businessUnit', 'location', 'roleName', 'recruiterId', 'source'],
  'metric.readiness.pool_variety': ['businessUnit', 'location', 'source', 'roleName', 'candidateType'],

  // --- Momentum ---
  'metric.momentum.time_to_next_step': ['currentStage', 'businessUnit', 'recruiterId', 'location', 'roleName'],
  'metric.momentum.time_to_cv_response': ['recruiterId', 'businessUnit', 'location', 'roleName', 'source'],
  'metric.momentum.time_spent_matching': ['recruiterId', 'businessUnit', 'roleName', 'location', 'source'],
  'metric.momentum.recruiting_experience_rating': ['source', 'businessUnit', 'location', 'candidateType', 'recruiterId'],

  // --- Experience ---
  'metric.experience.incomplete_applications': ['source', 'location', 'businessUnit', 'roleName', 'candidateType'],
  'metric.experience.time_to_apply': ['source', 'roleName', 'location', 'businessUnit', 'candidateType'],
  'metric.experience.ease_of_applying': ['source', 'businessUnit', 'location', 'roleName', 'candidateType'],

  // --- Diversity ---
  'metric.diversity.diverse_attraction': ['businessUnit', 'location', 'source', 'roleName', 'currentStage'],
  'metric.diversity.diverse_pipeline': ['businessUnit', 'location', 'roleName', 'source', 'recruiterId'],
  'metric.diversity.active_applicants': ['businessUnit', 'location', 'source', 'roleName', 'candidateType'],

  // --- Economics ---
  'metric.economics.cost_per_acquisition': ['businessUnit', 'location', 'source', 'roleName', 'recruiterId'],
  'metric.economics.presented_vs_offers': ['businessUnit', 'recruiterId', 'location', 'roleName', 'source'],
  'metric.economics.job_posting_effectiveness': ['businessUnit', 'location', 'roleName', 'source', 'recruiterId'],
  'metric.economics.hires_from_competitors': ['businessUnit', 'location', 'roleName', 'source', 'recruiterId'],
  'metric.economics.hm_feedback_time': ['recruiterId', 'businessUnit', 'location', 'roleName', 'currentStage'],
  'metric.economics.jd_criteria_match': ['businessUnit', 'roleName', 'location', 'source', 'recruiterId'],
  'metric.economics.interviewed_vs_offered': ['businessUnit', 'recruiterId', 'location', 'roleName', 'source'],
}
