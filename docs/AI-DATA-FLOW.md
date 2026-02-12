# AI Data Flow & Privacy Architecture

> **Last Updated:** February 11, 2025
> **Purpose:** Documents what data the AI sees and how privacy is maintained in the TA Cockpit

---

## Overview

The TA Cockpit uses AI to generate insights, narratives, and chat responses. This document explains exactly what data the AI receives and how we maintain privacy by sending only **aggregated metrics**, never raw candidate data.

---

## Key Privacy Principle

✅ **AI sees:** Aggregated statistics (counts, averages, percentages)
❌ **AI never sees:** Individual candidate records, PII, or raw data rows

---

## Three AI Endpoints

### 1. Metric Narratives API (`/api/metric-narratives`)

**Purpose:** Generates the alarm/insight/action text for each metric card

**Data Sent to AI:**
```json
{
  "metrics": [
    {
      "id": "metric.readiness.qualified_candidates_availability",
      "title": "Qualified Candidates Availability",
      "valueText": "3.9",
      "thresholdText": "> 5.0",
      "rag": "amber",
      "supportingFacts": [
        "Critical-skill requisitions: 45",
        "Qualified threshold: Skill_Match_Percentage >= 80"
      ],
      "docs": [
        /* 3 relevant knowledge base documents retrieved via RAG */
      ]
    }
    /* ... more metrics */
  ],
  "filters": { /* current filter state */ },
  "insightContext": { /* see InsightContext section below */ }
}
```

**Implementation:** [`api/metric-narratives.ts`](../api/metric-narratives.ts)

**Key Features:**
- For each metric, retrieves 3 relevant docs from knowledge base using RAG (line 103-109)
- Temperature: 0.2 (more deterministic)
- Falls back to rule-based narratives if LLM fails
- Max field lengths: alarm (180 chars), insight (320 chars), action (220 chars)

---

### 2. Cluster Insights API (`/api/insights`)

**Purpose:** Generates the "AI Brief" section for each cluster

**Data Sent to AI:**
```json
{
  "activeCluster": "readiness",
  "filters": { /* current filter state */ },
  "metricSnapshot": {
    "activeCluster": "readiness",
    "metrics": [
      {
        "id": "metric.readiness.qualified_candidates_availability",
        "title": "Qualified Candidates Availability",
        "valueText": "3.9",
        "thresholdText": "> 5.0",
        "rag": "amber",
        "supportingFacts": [...]
      }
      /* ... all metrics in cluster */
    ]
  },
  "insightContext": { /* see InsightContext section below */ }
}
```

**Implementation:** [`api/insights.ts`](../api/insights.ts)

**Key Features:**
- Temperature: 0.15 (very deterministic)
- Timeout: 35 seconds
- Returns structured output: headline, bullets (2-4), action, watchouts (0-3)
- Prioritizes red metrics first, then amber
- Falls back to rule-based insights if LLM fails

---

### 3. Chat API (`/api/chat`)

**Purpose:** Powers the chat widget for natural language Q&A

**System Prompt:**
> "You are a Senior Strategic Talent Acquisition Analyst for an airline HR executive dashboard.
>
> Hard rules:
> - Never invent KPI values. Use only numbers present in metricSnapshot.
> - For data-specific analysis, prioritize insightContext (derived from current uploaded dataset and active filters).
> - If you need KPI definitions, formulas, thresholds, or recommended actions, call retrieveDocs first.
> - Treat any static dataset profile in retrieved docs as background-only, not as current uploaded data.
> - Only reference aggregates; do not request or output raw candidate-level rows.
> - Keep answers concise and decision-ready.
> - If metricSnapshot values are all "--" or "N/A", state that no dataset is loaded or filters returned zero rows and ask to open filters."

**Data Sent to AI:**
```json
{
  "activeCluster": "readiness",
  "filters": { "department": ["Engineering"], /* ... */ },
  "metricSnapshot": {
    "activeCluster": "readiness",
    "metrics": [/* all current metrics */]
  },
  "insightContext": { /* see InsightContext section below */ }
}
```

**Implementation:** [`api/chat.ts`](../api/chat.ts)

**Key Features:**
- Temperature: 0.1 (very deterministic)
- Max output tokens: 700
- Timeout: 45 seconds
- Supports model fallback via OpenRouter
- Has access to 4 tools (see Tools section below)

**Available Tools:**

1. **`retrieveDocs`** (server-side)
   - Searches knowledge base for KPI definitions and best practices
   - Uses hybrid search (semantic + keyword)
   - Returns up to 12 docs (default: 6)

2. **`openFilters`** (client-side)
   - Tells UI to open the filters panel
   - No parameters

3. **`expandMetric`** (client-side)
   - Tells UI to expand a specific metric card
   - Parameter: `metricId` (must match a metric from metricSnapshot)

4. **`askForConfirmation`** (client-side)
   - Asks user to confirm before taking irreversible action
   - Parameter: `message` (confirmation prompt)

---

## InsightContext Structure

**Purpose:** Rich aggregated data computed from the uploaded dataset

**Implementation:** [`src/features/cockpit/runtime-data/insights.ts`](../src/features/cockpit/runtime-data/insights.ts)

**Data Structure:**
```typescript
{
  summary: {
    totalRows: 15420,              // Total application records
    uniqueApplications: 12843,     // Unique applications
    uniqueCandidates: 11204,       // Unique candidates
    uniqueRequisitions: 342        // Unique job reqs
  },
  statusMix: {
    active: 8234,                  // Active applications
    hired: 1876,                   // Hired candidates
    rejected: 2733                 // Rejected applications
  },
  redMetrics: [
    {
      id: "metric.economics.cost_per_acquisition",
      title: "Cost per Acquisition",
      valueText: "$4,250",
      thresholdText: "< $4,000",
      rag: "red"
    }
    /* ... all red metrics */
  ],
  amberMetrics: [
    /* ... all amber metrics */
  ],
  topFunnelStages: [
    { stage: "Application Review", applications: 4532 },
    { stage: "Phone Screen", applications: 2341 },
    { stage: "Technical Interview", applications: 1876 },
    { stage: "Final Interview", applications: 1234 },
    { stage: "Offer", applications: 892 },
    { stage: "Background Check", applications: 654 }
  ],
  weeklyTrend: {
    points: [
      /* Last 12 weeks of data */
      { weekStart: "2025-01-27", applications: 234, hires: 42 },
      { weekStart: "2025-02-03", applications: 267, hires: 38 },
      /* ... */
    ],
    applicationsWoWChangePct: -3.2,  // Week-over-week % change
    hiresWoWChangePct: 8.5
  },
  sourceMixTop: [
    { source: "LinkedIn", applications: 3421, sharePct: 26.7 },
    { source: "Employee Referral", applications: 2134, sharePct: 16.6 },
    { source: "Indeed", applications: 1876, sharePct: 14.6 },
    { source: "Company Website", applications: 1543, sharePct: 12.0 },
    { source: "Glassdoor", applications: 987, sharePct: 7.7 }
  ],
  stageAgingTop: [
    { stage: "Final Interview", sampleSize: 234, p50Days: 4.2, p90Days: 12.8 },
    { stage: "Background Check", sampleSize: 156, p50Days: 3.1, p90Days: 11.2 },
    { stage: "Offer", sampleSize: 189, p50Days: 2.8, p90Days: 8.9 },
    { stage: "Phone Screen", sampleSize: 421, p50Days: 2.1, p90Days: 7.3 },
    { stage: "Technical Interview", sampleSize: 312, p50Days: 3.4, p90Days: 6.8 }
  ]
}
```

---

## Current Metric Thresholds

**Last Updated:** February 11, 2025 (adjusted for stakeholder credibility)

### Updated Thresholds

| Metric | Old Threshold | New Threshold | Rationale |
|--------|---------------|---------------|-----------|
| **Cost per Acquisition** | < $2,500 | **< $4,000** | Industry average is $4k-$5k |
| **Time to Next Step** | < 3.0 days | **< 5.0 days** | More realistic across all stages |
| **Incomplete Applications** | < 15% | **< 20%** | Best-in-class is 15-25% |

### All Thresholds

**Readiness:**
- Qualified Candidates Availability: > 5.0
- Skill Readiness: > 70%
- External Connections: > 1,000
- Time to Present: < 7.0 days
- Critical Skill Capability: > 90%
- Pool Variety: > 10

**Momentum:**
- Time to Next Step Decision: < 5.0 days ✅ *Updated*
- Time to CV Response: < 24 hrs
- Time Spent Matching: < 6.0 hrs
- Recruiting Experience Rating: > 4.2/5

**Experience:**
- Incomplete Applications: < 20% ✅ *Updated*
- Time to Apply: < 10 mins
- Ease of Applying Rating: > 4.0/5

**Diversity:**
- Diverse Attraction: > 40%
- Diverse Pipeline: > 40%
- Active Applicants: > 8,000

**Economics:**
- Cost per Acquisition: < $4,000 ✅ *Updated*
- Presented vs Offers: > 25%
- Job Posting Effectiveness: > 8%
- Hires from Competitors: > 15%
- HM Feedback Time: < 2.0 days
- JD Criteria Match: > 75%
- Interviewed vs Offered Ratio: Target 1:4

---

## Privacy Guarantees

### What AI Never Sees

❌ Individual candidate names
❌ Email addresses
❌ Phone numbers
❌ Resume text
❌ Interview notes
❌ Any personally identifiable information (PII)
❌ Raw data rows

### Example: Data Transformation

**User Uploads (Raw Data):**
```
Candidate_Name,Email,Application_Date,Status,Source,Role
Jane Doe,jane@email.com,2024-01-15,Rejected,LinkedIn,Software Engineer
John Smith,john@email.com,2024-01-16,Hired,Referral,Data Scientist
...11,202 more rows...
```

**AI Receives (Aggregated):**
```json
{
  "summary": {
    "uniqueCandidates": 11204
  },
  "statusMix": {
    "hired": 1876,
    "rejected": 2733
  },
  "sourceMixTop": [
    { "source": "LinkedIn", "applications": 3421, "sharePct": 26.7 },
    { "source": "Referral", "applications": 2134, "sharePct": 16.6 }
  ]
}
```

**No candidate names, emails, or individual records are ever sent to the AI.**

---

## Knowledge Base (RAG)

**Purpose:** Provides static knowledge about TA metrics, definitions, and best practices

**Implementation:**
- Documents: [`api/knowledge-base/documents.ts`](../api/knowledge-base/documents.ts)
- Retrieval: [`api/rag/retrieve.ts`](../api/rag/retrieve.ts)
- Vector DB: Qdrant (configured in [`api/rag/qdrant.ts`](../api/rag/qdrant.ts))

**Retrieval Modes:**
1. **Semantic search** (default) - Uses embeddings via Qdrant
2. **Keyword fallback** - Simple text matching if vector DB unavailable
3. **Hybrid** - Combines both approaches

**When Knowledge Base is Used:**
- Metric narratives: 3 docs per metric
- Chat: On-demand via `retrieveDocs` tool (user queries or AI decides)
- Never includes user-uploaded data

---

## Summary: Privacy-Safe Architecture

```
┌─────────────────────────────────────────────────┐
│  User Uploads Excel (12,000 candidate rows)     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Local Processing (Client/Server)               │
│  - Parse data                                    │
│  - Compute metrics (averages, counts, %)        │
│  - Generate aggregated context                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Send to AI APIs                                 │
│  ✅ Aggregated metrics only                     │
│  ✅ Statistical summaries                       │
│  ✅ No PII                                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  AI Generates Insights                           │
│  - Analyzes patterns in metrics                  │
│  - Never sees individual candidates              │
└─────────────────────────────────────────────────┘
```

**Bottom Line:** The AI analyzes statistical patterns, not people. This architecture is privacy-safe and follows best practices for handling sensitive HR data. 🔒

---

## Related Files

- Metric computation logic: [`src/features/cockpit/model/runtimeMetrics.ts`](../src/features/cockpit/model/runtimeMetrics.ts)
- Insight context generation: [`src/features/cockpit/runtime-data/insights.ts`](../src/features/cockpit/runtime-data/insights.ts)
- Static metric templates: [`src/features/cockpit/model/sampleData.ts`](../src/features/cockpit/model/sampleData.ts)
- Main cockpit page: [`src/features/cockpit/CockpitPage.tsx`](../src/features/cockpit/CockpitPage.tsx)

---

## Questions or Concerns?

If you have questions about what data is being sent to AI or need to audit the privacy architecture, review:

1. The three API handlers in the `/api` directory
2. The `computeInsightContext` function for insight context structure
3. The `computeMetric` function for how metrics are aggregated
4. Network tab in browser DevTools to inspect actual payloads

**No raw candidate data leaves the application.** Only aggregated statistics are transmitted to AI providers.
