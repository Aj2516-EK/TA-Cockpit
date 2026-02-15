# Formula & Threshold Alignment Audit

Comparison of `Formulas.docx` (spec) vs `runtimeMetrics.ts` (code implementation).

---

## Cluster 1: Talent Readiness & Market Strength

| Metric | Status | Details |
|--------|--------|---------|
| Qualified Candidates Availability | **Aligned** | Formula and threshold (`≥ 5 per role`) match |
| Talent Pool Skill Readiness | **Formula differs** | Doc: `Candidates Meeting Criteria ÷ Total Pool × 100` (binary pass/fail count). Code: `Avg(Skill_Match_Percentage)` across candidates. Threshold (`≥ 70%`) matches. |
| Active External Connections | **Threshold differs** | Doc: `↑ MoM` (relative, month-over-month). Code: absolute `> 1,000`. Also no 30-day window filter in code. |
| Critical Skill Hiring Capability | **Aligned** | Formula and threshold (`≥ 90%`) match |
| Time to Present Critical Skills | **Aligned** | Formula and threshold (`≤ 7 days`) match |
| Talent Pool Size & Variety | **Both differ** | Doc formula: `Unique Candidates × Skill Diversity Index` with threshold `≥ Baseline +10% YoY`. Code: avg unique candidates per requisition with threshold `> 10`. Completely different formula and threshold. |

## Cluster 2: Candidate Responsiveness & Momentum

| Metric | Status | Details |
|--------|--------|---------|
| Time to Next Step Decision | **Threshold differs** | Doc: `≤ 3 days`. Code: `< 5.0 days`. Formula is the same. |
| Time Spent Matching | **Aligned** | Formula and threshold (`≤ 6 hrs`) match |
| Time to CV Response | **Aligned** | Formula and threshold (`≤ 24 hrs`) match |
| Recruiting Experience Rating | **Aligned** | Formula and threshold (`≥ 4.2 / 5`) match |

## Cluster 3: Application Experience & Drop-Off Risk

| Metric | Status | Details |
|--------|--------|---------|
| Incomplete Applications | **Threshold differs** | Doc: `≤ 15%`. Code: `< 20%`. Formula is the same. |
| Time to Apply | **Aligned** | Formula and threshold (`≤ 10 mins`) match |
| Ease of Applying Rating | **Aligned** | Formula and threshold (`≥ 4.0 / 5`) match |

## Cluster 4: Diversity & Talent Reach

| Metric | Status | Details |
|--------|--------|---------|
| Diverse Candidates Attraction | **Threshold differs** | Doc: `≥ Market Benchmark` (undefined). Code: `> 40%`. |
| Diverse Talent Pipeline | **Formula differs** | Doc: diverse candidates **in pipeline** (all stages). Code: female **hires only** (`Status === 'Hired'`). Threshold (`≥ 40%`) matches. |
| Active Applicants | **Threshold differs** | Doc: `↑ QoQ` (relative, quarter-over-quarter). Code: absolute `> 8,000`. Also doc specifies "Active in Last 30 Days" — code uses `Status === 'Active'` with no date window. |

## Cluster 5: Hiring Economics & Efficiency

| Metric | Status | Details |
|--------|--------|---------|
| Cost per Acquisition | **Threshold differs** | Doc: `≤ Budget` (abstract). Code: `< AED 14,700`. Formula matches. |
| Candidates Presented vs Offers Made | **Aligned** | Formula and threshold (`≥ 25%`) match |
| Job Posting Effectiveness | **Aligned** | Formula and threshold (`≥ 8%`) match |
| Hires from Competitors | **Threshold differs** | Doc: `Contextual` (undefined). Code: `> 15%`. |
| Hiring Manager Feedback Time | **Aligned** | Formula and threshold (`≤ 2 days`) match |
| JD Criteria Match | **Formula differs** | Doc: `Skills Matched ÷ Skills Required × 100` (per-JD granular). Code: `Avg(Skill_Match_Percentage)` as proxy. Threshold (`≥ 75%`) matches. |
| Interviewed vs Offered Ratio | **Aligned** | Both target `1:4` |

---

## Summary of What Needs Alignment

### Threshold mismatches (concrete fixes)

1. **Time to Next Step Decision** — change from `< 5.0 days` to `≤ 3 days`
2. **Incomplete Applications** — change from `< 20%` to `≤ 15%`

### Formula mismatches (proxy vs spec)

3. **Talent Pool Skill Readiness** — code uses avg skill %, doc wants binary pass/fail ratio
4. **Talent Pool Size & Variety** — completely different formula and threshold
5. **Diverse Talent Pipeline** — code only counts hires, doc counts all pipeline stages
6. **JD Criteria Match** — code uses avg skill match % as proxy, doc wants per-JD skills matched/required

### Relative thresholds not implemented (doc uses trend-based targets)

7. **Active External Connections** — doc says `↑ MoM`, code uses absolute `> 1,000`
8. **Active Applicants** — doc says `↑ QoQ`, code uses absolute `> 8,000`
9. **Diverse Candidates Attraction** — doc says `≥ Market Benchmark`
10. **Cost per Acquisition** — doc says `≤ Budget`
11. **Hires from Competitors** — doc says `Contextual`
