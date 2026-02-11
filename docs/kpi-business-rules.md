# KPI and Business Rules

This document captures the KPI computation logic currently implemented in the TA Cockpit codebase.

Source of truth:
- `src/features/cockpit/runtime-data/parse.ts`
- `src/features/cockpit/runtime-data/filters.ts`
- `src/features/cockpit/model/runtimeMetrics.ts`
- `src/features/cockpit/runtime-data/charts.ts`

## 1) Canonical Fact Model and Data Rules

### 1.1 Upload inputs
- Supported file types: `.xlsx`, `.xls`, `.csv`
- For `.xlsx/.xls`, expected sheets:
  - `1_Requisition`
  - `2_Candidate`
  - `3_Application_Pipeline` (fact-driving sheet)
  - `4_Recruiter_Activity`
  - `5_Interview_Offer`
  - `6_Hiring_Cost`
  - `7_Job_Posting_Analytics`
- For `.csv`, file is treated as already-canonical fact rows (best-effort header mapping).

### 1.2 Fact row grain
- One row per pipeline record from `3_Application_Pipeline`.
- Join keys:
  - `Candidate_ID` -> `2_Candidate.Candidate_ID`
  - `Requisition_ID` -> `1_Requisition.Requisition_ID`
  - `Requisition_ID` -> `6_Hiring_Cost.Requisition_ID`
  - `Requisition_ID` -> `7_Job_Posting_Analytics.Job_ID`

### 1.3 Aggregation/selection rules during join
- Recruiter activity (`4_Recruiter_Activity`) is aggregated by candidate:
  - `matchingHoursTotal` = sum of `Time_Spent_Matching (hrs)` across all candidate interactions.
  - `recruiterId` = recruiter on the most recent `Interaction_Date`.
- Interview/offer (`5_Interview_Offer`) keeps one record per candidate:
  - Latest by `Interview_Date`, fallback to `Offer_Date`, fallback to `Feedback_Date`.

### 1.4 Normalization rules
- Strings: trimmed; empty string -> `null`.
- Numbers: commas removed then parsed; invalid -> `null`.
- Booleans (`Y/N`, `Yes/No`, `True/False`): mapped to `true/false`, else `null`.
- Dates: parsed to JS Date; invalid -> `null`.
- Candidate type:
  - contains `internal` -> `Internal`
  - contains `external` -> `External`
  - otherwise `null`
- Status must be one of: `Active | Rejected | Hired`, else `null`.

### 1.5 Diagnostics rules
- For workbook uploads, diagnostics include:
  - sheet row counts/columns
  - join coverage counters
  - samples of missing candidate/requisition IDs
- Warnings trigger if:
  - pipeline sheet has 0 rows
  - candidate join coverage < 95%
  - requisition join coverage < 95%

## 2) Filter Rules

- Date filter uses `applicationDate`.
- `dateFrom` is inclusive from start of day.
- `dateTo` is inclusive to end of day (`23:59:59.999`).
- If a filter list is empty, no restriction is applied.
- If a filter list is active and a row has `null` for that field, row is excluded.

Supported filters:
- `dateFrom`, `dateTo`
- `businessUnit`, `location`, `roleName`, `criticalSkillFlag`
- `source`, `candidateType`, `diversityFlag`
- `currentStage`, `status`, `recruiterId`

## 3) KPI Definitions (Current Implementation)

RAG helper logic:
- Higher-is-better: `green` if value >= green threshold, `amber` if >= amber threshold, else `red`.
- Lower-is-better: `green` if value <= green threshold, `amber` if <= amber threshold, else `red`.

All metrics are computed on **filtered rows**.

### 3.1 Readiness

1. `metric.readiness.qualified_candidates_availability`
- Formula: average qualified candidates per critical-skill requisition.
- Qualified candidate rule: `Skill_Match_Percentage >= 80` and candidate joined.
- Threshold text: `> 5.0`
- RAG: green >= 5.0, amber >= 3.5, red < 3.5

2. `metric.readiness.skill_readiness`
- Formula: average `Skill_Match_Percentage` across unique candidates.
- Threshold text: `> 70%`
- RAG: green >= 70, amber >= 66, red < 66

3. `metric.readiness.external_connections`
- Formula (proxy): count of unique `External` candidates with recruiter activity (`recruiterId` present or `matchingHoursTotal > 0`).
- Threshold text: `> 1,000`
- RAG: green >= 1000, amber >= 800, red < 800

4. `metric.readiness.time_to_present`
- Formula (proxy): mean days from requisition open date to first application date for critical-skill requisitions.
- Negative deltas (application before open date) are dropped.
- Threshold text: `< 7.0 days`
- RAG: green <= 7.0, amber <= 9.0, red > 9.0

5. `metric.readiness.critical_skill_capability`
- Formula (proxy): `% of critical-skill requisitions with at least 1 hire`.
- Threshold text: `> 90%`
- RAG: green >= 90, amber >= 84, red < 84

6. `metric.readiness.pool_variety`
- Formula (proxy): average unique candidates per requisition.
- Threshold text: `> 10`
- RAG: green >= 10, amber >= 7, red < 7

### 3.2 Momentum

1. `metric.momentum.time_to_next_step`
- Formula (proxy): mean stage duration = `Stage_Exit_Date - Stage_Enter_Date` in days.
- Uses non-negative durations only.
- Threshold text: `< 3.0 days`
- RAG: green <= 3.0, amber <= 4.0, red > 4.0

2. `metric.momentum.time_to_cv_response`
- Formula: mean `Recruiter_Response_Time` (hours).
- Threshold text: `< 24 hrs`
- RAG: green <= 24, amber <= 30, red > 30

3. `metric.momentum.time_spent_matching`
- Formula (proxy): average `matchingHoursTotal` across unique candidates.
- Threshold text: `< 6.0 hrs`
- RAG: green <= 6.0, amber <= 7.0, red > 7.0

4. `metric.momentum.recruiting_experience_rating`
- Formula (proxy): average `(Candidate_NPS / 2)` across unique candidates, shown on a 1-5 scale.
- Threshold text: `> 4.2`
- RAG: green >= 4.2, amber >= 4.0, red < 4.0

### 3.3 Experience

1. `metric.experience.incomplete_applications`
- Formula: `% of unique candidates with Application_Completed = false`.
- Threshold text: `< 15%`
- RAG: green <= 15, amber <= 20, red > 20

2. `metric.experience.time_to_apply`
- Formula: mean minutes between `Application_Start_Time` and `Application_Submit_Time` across unique candidates.
- Uses non-negative durations only.
- Threshold text: `< 10 mins`
- RAG: green <= 10, amber <= 12, red > 12

3. `metric.experience.ease_of_applying`
- Formula: average `Application_Ease_Rating` across unique candidates.
- Threshold text: `> 4.0`
- RAG: green >= 4.0, amber >= 3.8, red < 3.8

### 3.4 Diversity

1. `metric.diversity.diverse_attraction`
- Formula: `% of unique candidates with Diversity_Flag = true`.
- Threshold text: `> 40%`
- RAG: green >= 40, amber >= 35, red < 35

2. `metric.diversity.diverse_pipeline`
- Formula (proxy): `% of unique hired candidates (`Status = Hired`) where `Diversity_Flag = true`.
- Threshold text: `> 40%`
- RAG: green >= 40, amber >= 32, red < 32

3. `metric.diversity.active_applicants`
- Formula: count of unique candidates with `Status = Active`.
- Threshold text: `> 8,000`
- RAG: green >= 8000, amber >= 6000, red < 6000

### 3.5 Economics

1. `metric.economics.cost_per_acquisition`
- Formula (proxy): `(sum of Total_Hiring_Cost once per requisition) / (unique application count)`.
- If unique application IDs are missing, denominator falls back to row count.
- Threshold text: `< $2,500`
- RAG: green <= 2500, amber <= 3200, red > 3200

2. `metric.economics.job_posting_effectiveness`
- Formula: `(sum Applications_Received) / (sum Job_Views) * 100`, one posting record per requisition.
- Threshold text: `> 8%`
- RAG: green >= 8, amber >= 6, red < 6

3. `metric.economics.hires_from_competitors`
- Formula: `% of unique hired candidates where Is_Competitor = true`.
- Threshold text: `> 15%`
- RAG: green >= 15, amber >= 12, red < 12

4. `metric.economics.hm_feedback_time`
- Formula (proxy): mean days between `Interview_Date` and `Feedback_Date` across unique candidates.
- Uses non-negative durations only.
- Threshold text: `< 2.0 days`
- RAG: green <= 2.0, amber <= 2.5, red > 2.5

5. `metric.economics.jd_criteria_match`
- Formula (proxy): average `Skill_Match_Percentage` across unique candidates.
- Threshold text: `> 75%`
- RAG: green >= 75, amber >= 72, red < 72

6. `metric.economics.interviewed_vs_offered`
- Formula (proxy): `interviewed unique candidates / unique candidates with Offer_Made = true`.
- Display format: `1 : X`
- Threshold text: `Target 1 : 4`
- RAG: green if X >= 4, amber if X >= 3, red otherwise

## 4) KPI Not Yet Implemented in Runtime Engine

- Template-only metric ID currently not computed in `runtimeMetrics.ts`:
  - `metric.economics.presented_vs_offers`
- Behavior in UI:
  - shown as `N/A`
  - supporting fact: `MVP: metric not implemented yet.`

## 5) N/A Behavior Rules

For a metric tile, `N/A` is shown when:
- required fields are missing for the current filtered slice, or
- no valid records remain after validation (for example, no non-negative duration rows), or
- metric is template-only and not implemented.

## 6) Chart Business Logic (Current)

### 6.1 Funnel by Current Stage
- Computation: unique `Application_ID` count per `Current_Stage`.
- Stage ordering uses semantic sort:
  - Applied, Screen, Shortlist, Interview, Offer, Hired, Rejected, then others.
- If `Application_ID` is missing, those rows are tracked as diagnostics and excluded from unique per-stage counts.

### 6.2 Weekly Applications vs Hires
- Week bucket: ISO week start (Monday) based on `Application_Date`.
- Applications series: unique applications per week.
- Hires series: unique applications per week where `Status = Hired`.

### 6.3 Derived chart KPIs shown in drawer
- `Applications` = total unique applications from filtered data (fallback to row count if IDs missing).
- `Hires` = unique applications where status is hired.
- `Hire rate` = `Hires / Applications`.

## 7) AI Context Grounding Rules

- `metricSnapshot` is derived from currently filtered metrics:
  - `id`, `title`, `valueText`, `thresholdText`, `rag`, `supportingFacts`.
- `activeCluster` + `metricSnapshot` + current filters are sent with each chat request.
- Chat instructions explicitly require:
  - do not invent KPI values
  - use only values from `metricSnapshot`
  - call out unavailable KPIs as unavailable.
