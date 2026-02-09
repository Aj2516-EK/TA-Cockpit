# TA Intelligence Cockpit: Product Requirements

## Summary
The TA Intelligence Cockpit is a single-page, airline-themed executive dashboard that turns recruitment operational data into:
- RAG-scored KPI tiles across 5 clusters
- Decision-ready alarm narratives (benchmarking/trends)
- AI-generated insights and recommended actions grounded in the active dataset and filters

It supports interactive filtering and a chat-like "Ask AI" interface to explain metrics and answer questions using the same metric definitions and the current filtered context.

## MVP Goal (Hackathon)
Make the prototype functional using an uploaded dataset for the demo:
- Upload an `.xlsx` or `.csv` file at runtime
- Compute all KPI values deterministically from the uploaded dataset (no seeded random values)
- Apply filters and recompute tiles live
- AI generates insights/recommendations and answers questions based on computed KPI values + definitions

## Non-Goals (MVP)
- No enterprise auth/SSO
- No multi-tenant permissions
- No long-term data storage requirement (demo can be per-session)
- No "AI calculates metrics" (AI narrates; code calculates)

## UI/UX Requirements
### Branding and Tone
- Airline HR Exec dashboard feel (CHRO-ready), not a gaming UI
- Cyber/punk futuristic vibe: ambient glow, subtle borders, enterprise-safe contrast

### Design Constitution (Do Not Break)
- All metric tiles must remain visible and intact
- Inside a cluster: order tiles by severity: Red first, then Amber, then Green

### Tile (Metric Card) Behavior
- Tile communicates severity via its own color (no text-color hacks)
- Every tile is clickable and expands/collapses inline
- Expanded structure includes:
  - Metric value + linear progress vs threshold (threshold logic surfaced)
  - Alarm message banner: decision-ready narrative (benchmarks/trends/outliers)
  - AI Insight (grounded in data)
  - Recommended Action (grounded in data)
  - Optional: AI confidence score

### Left Panel
- Header: "HR Talent Acquisition Data Intelligence Hub"
- "Key Insights": auto-generated top critical insights from Red tiles
- "Ask AI": free text input that explains/filter-contextualizes metrics

## Data Requirements
### Dataset Source (MVP)
Demo uses runtime upload (no persistent storage required).

Current repo includes `Data for Cockpit.xlsx` with these sheets:
- `1_Requisition`
- `2_Candidate`
- `3_Application_Pipeline`
- `4_Recruiter_Activity`
- `5_Interview_Offer`
- `6_Hiring_Cost`
- `7_Job_Posting_Analytics`

### Filters (UI)
MVP should support a subset, but the intended filter list is:
- Financial Year
- Application Date From/To
- Company
- Department / Business Unit
- Cost Centre
- Job grade
- Requisition
- Recruiter
- Gender
- Nationality
- Internal/External
- Candidate Country of Residence
- Ethnicity

## Metrics and Clusters (5)
### Cluster 1: Talent Readiness & Market Strength
Tooltip:
- Are we ready to hire critical talent right now?
- Check out the depth, readiness, and speed of supply: the backbone of hiring confidence.

Metrics:
- Qualified candidates availability
- Talent pool skill readiness
- Active external connections
- Critical skill hiring capability
- Time to present critical skills
- Talent pool size & variety

### Cluster 2: Candidate Responsiveness & Momentum
Tooltip:
- How quickly are we responding and moving candidates forward?
- Check out the momentum loss or gain in the candidate journey.

Metrics:
- Time to next step decision
- Time spent matching
- Time to CV response
- Recruiting experience rating

### Cluster 3: Application Experience & Drop-Off Risk
Tooltip:
- Where are candidates getting frustrated or abandoning us?
- Check out the conversion friction cluster: small issues here quietly destroy talent supply.

Metrics:
- Incomplete applications
- Time to apply
- Ease of applying rating

### Cluster 4: Diversity & Talent Reach
Tooltip:
- How broad, inclusive, and future-ready is our reach?
- Check out the reach, inclusivity, and pipeline health at scale.

Metrics:
- Diverse candidates attraction
- Diverse talent pipeline
- Active applicants

### Cluster 5: Hiring Economics & Efficiency
Tooltip:
- Are we hiring smart and cost-effectively?
- Check out the supporting efficiency layer, with deep-dive reviews.

Metrics:
- Cost per acquisition
- Candidates presented vs offers made
- Job posting effectiveness
- Hires from competitors
- Hiring Manager feedback time
- JD criteria match percentage
- Interviewed vs offered ratio

## Metric Engine (Functional Requirement)
Each metric must have:
- Definition and formula
- Units (%, days, hours, count, currency)
- Threshold configuration (RAG rules)
- Computation based on the active filters
- Supporting facts used for the alarm narrative (trend deltas, benchmarks, denominators)

## AI Requirements
### What AI Does
- Generates alarm narratives that include benchmark/historic context where possible
- Produces insights and recommended actions based on:
  - Computed KPI values
  - Current filters
  - Metric definitions + thresholds

### What AI Must Not Do
- Invent KPI values
- Change the definition/formula of a KPI across answers

### RAG (Retrieval) Scope
For MVP, retrieval content should at minimum include:
- Metric definitions/formulas/thresholds
- Interpreting guidance ("what good looks like", what to do when Red)
- The current computed KPI snapshot and trend deltas for the selected filters

## Tech Stack (MVP Candidate for Vercel-All-In-One)
The stack should allow hosting from GitHub on Vercel (CI/CD) with minimal ops.

Recommended MVP stack (no Python required):
- Frontend: Vite + React + TypeScript
- UI: Tailwind (or CSS variables), existing cyber/exec styling preserved
- Data parsing: `xlsx` in the browser for uploads (avoid server upload limits)
- Metrics engine: TypeScript in the frontend (deterministic calculations)
- AI: Vercel Serverless Function (`/api/ai`) in Node/TypeScript calling OpenRouter
  - The browser sends only: query + filters + computed KPI snapshot + small supporting aggregates
  - OpenRouter API key stays server-side in Vercel environment variables

Optional (not required for MVP):
- Persist assignments/actions: localStorage only (no DB), or add Vercel KV/Blob later

## Deployment
- Hosted on Vercel from GitHub
- Environment variables on Vercel:
  - `OPENROUTER_API_KEY`
  - `PRIMARY_MODEL` (optional)

