# Metric Dimensional Breakdown Charts

## Overview

Each metric tile in the TA Intelligence Cockpit now includes **dimensional breakdown charts** that appear when the user clicks "Visualize". These charts show how the metric value varies across key dimensions such as Business Unit, Location, Source, Recruiter, and Role.

Up to **3 horizontal bar charts** are rendered per metric, dynamically selecting the top 3 dimensions that have meaningful data (at least 2 distinct values) from a priority-ordered list.

## How It Works

1. **Priority dimensions** are configured per metric in `breakdownConfig.ts`. Each metric has 5 candidate dimensions ordered by relevance.
2. When the user opens the visualization panel, the system checks which dimensions have >=2 distinct values in the current filtered rows.
3. The first 3 qualifying dimensions are computed and displayed.
4. For each dimension, rows are grouped by dimension value, and the metric is computed per group using the same `computeMetric()` engine.
5. Bars are sorted by row count (largest groups first), capped at 10 bars per chart.

## How to Read the Charts

- **Each bar** represents a group (e.g., a specific Business Unit) with its own computed metric value.
- **Bar color** reflects the RAG status of that group (red/amber/green), using the same thresholds as the overall metric.
- **Dashed vertical line** marks the overall metric value for reference — groups to the left are below average, groups to the right are above.
- **Value text** on the right shows the exact computed value for each group.

## Complete Metric-Dimension Priority Map

### Readiness

| Metric | Dim 1 | Dim 2 | Dim 3 | Dim 4 | Dim 5 |
|--------|-------|-------|-------|-------|-------|
| Qualified Candidates Availability | Business Unit | Location | Role | Source | Recruiter |
| Talent Pool Skill Readiness | Business Unit | Role | Location | Source | Candidate Type |
| Active External Connections | Source | Location | Business Unit | Recruiter | Role |
| Time to Present Critical Skills | Business Unit | Location | Role | Recruiter | Source |
| Critical Skill Hiring Capability | Business Unit | Location | Role | Recruiter | Source |
| Talent Pool Size & Variety | Business Unit | Location | Source | Role | Candidate Type |

### Momentum

| Metric | Dim 1 | Dim 2 | Dim 3 | Dim 4 | Dim 5 |
|--------|-------|-------|-------|-------|-------|
| Time to Next Step Decision | Pipeline Stage | Business Unit | Recruiter | Location | Role |
| Time to CV Response | Recruiter | Business Unit | Location | Role | Source |
| Time Spent Matching | Recruiter | Business Unit | Role | Location | Source |
| Recruiting Experience Rating | Source | Business Unit | Location | Candidate Type | Recruiter |

### Experience

| Metric | Dim 1 | Dim 2 | Dim 3 | Dim 4 | Dim 5 |
|--------|-------|-------|-------|-------|-------|
| Incomplete Applications | Source | Location | Business Unit | Role | Candidate Type |
| Time to Apply | Source | Role | Location | Business Unit | Candidate Type |
| Ease of Applying Rating | Source | Business Unit | Location | Role | Candidate Type |

### Diversity

| Metric | Dim 1 | Dim 2 | Dim 3 | Dim 4 | Dim 5 |
|--------|-------|-------|-------|-------|-------|
| Female Candidates Attraction | Business Unit | Location | Source | Role | Pipeline Stage |
| Female Talent Pipeline | Business Unit | Location | Role | Source | Recruiter |
| Active Applicants | Business Unit | Location | Source | Role | Candidate Type |

### Economics

| Metric | Dim 1 | Dim 2 | Dim 3 | Dim 4 | Dim 5 |
|--------|-------|-------|-------|-------|-------|
| Cost per Acquisition | Business Unit | Location | Source | Role | Recruiter |
| Presented vs Offers | Business Unit | Recruiter | Location | Role | Source |
| Job Posting Effectiveness | Business Unit | Location | Role | Source | Recruiter |
| Hires from Competitors | Business Unit | Location | Role | Source | Recruiter |
| HM Feedback Time | Recruiter | Business Unit | Location | Role | Pipeline Stage |
| JD Criteria Match | Business Unit | Role | Location | Source | Recruiter |
| Interviewed vs Offered Ratio | Business Unit | Recruiter | Location | Role | Source |

## Visual Design

- **Horizontal bar chart** using inline SVG (no external charting library)
- Left column: dimension value labels (truncated to 14 chars)
- Center: SVG bars proportional to value, colored by per-group RAG
- Right column: value text in RAG color
- Dashed vertical reference line at the overall metric value
- Bar height: 16px, gap: 6px
- Track background: `bg-slate-900/6 dark:bg-white/6` (matches existing viz style)
- Animated bar width on render

## Performance

- Computation is wrapped in `useMemo` — only runs when the viz panel is open and data changes
- Only 1-2 viz panels are typically open at a time
- Bars capped at 10 per chart for high-cardinality dimensions
- Dimension availability check short-circuits after finding 2 distinct values
