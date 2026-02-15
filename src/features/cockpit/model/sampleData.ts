import type { ClusterId, ClusterMeta, KeyInsight, Metric, Rag } from './types'
import { gapToTargetText, ragLabel } from './metricExplain'

export const clusters: ClusterMeta[] = [
  {
    id: 'readiness',
    shortLabel: 'Readiness',
    title: 'Talent Readiness & Market Strength',
    description:
      'Are we ready to hire critical talent right now? Check out the depth, readiness, and speed of supply: the backbone of hiring confidence.',
    colorVar: '--ta-teal',
    icon: 'rocket_launch',
  },
  {
    id: 'momentum',
    shortLabel: 'Momentum',
    title: 'Candidate Responsiveness & Momentum',
    description:
      'How quickly are we responding and moving candidates forward? Check out momentum loss or gain in the candidate journey.',
    colorVar: '--ta-purple',
    icon: 'bolt',
  },
  {
    id: 'experience',
    shortLabel: 'Experience',
    title: 'Application Experience & Drop-Off Risk',
    description:
      'Where are candidates getting frustrated or abandoning us? Conversion friction here quietly destroys talent supply.',
    colorVar: '--ta-magenta',
    icon: 'sentiment_satisfied',
  },
  {
    id: 'diversity',
    shortLabel: 'Diversity',
    title: 'Diversity & Talent Reach',
    description:
      'How broad, inclusive, and future-ready is our reach? Check reach, inclusivity, and pipeline health at scale.',
    colorVar: '--ta-indigo',
    icon: 'diversity_3',
  },
  {
    id: 'economics',
    shortLabel: 'Economics',
    title: 'Hiring Economics & Efficiency',
    description:
      'Are we hiring smart and cost-effectively? Check the efficiency layer, then deep-dive into the drivers.',
    colorVar: '--ta-blue',
    icon: 'payments',
  },
]

const mk = (m: Omit<Metric, 'id'> & { idSuffix: string }, cluster: ClusterId): Metric => ({
  ...m,
  id: `metric.${cluster}.${m.idSuffix}`,
})

// These are UI templates (static copy + icons). Values get overwritten by the metrics engine at runtime.
export const metricTemplatesByCluster: Record<ClusterId, Metric[]> = {
  readiness: [
    mk(
      {
        idSuffix: 'qualified_candidates_availability',
        title: 'Qualified Candidates Availability',
        valueText: '3.9',
        valueNum: 3.9,
        thresholdText: '> 5.0',
        rag: 'amber',
        icon: 'groups',
        alarm: 'Supply is trending below benchmark for critical roles.',
        insight:
          'Qualified pool is thin in high-demand segments; sourcing is not keeping pace with requisition velocity.',
        action: 'Trigger targeted sourcing sprints for critical roles and rebalance recruiter capacity.',
      },
      'readiness',
    ),
    mk(
      {
        idSuffix: 'skill_readiness',
        title: 'Talent Pool Skill Readiness',
        valueText: '68%',
        valueNum: 68,
        unit: '%',
        thresholdText: '> 70%',
        rag: 'amber',
        icon: 'psychology',
        alarm: 'Skill readiness is close to threshold; risk of mismatch is rising.',
        insight: 'Competency match is uneven across roles; high variance suggests inconsistent screening standards.',
        action: 'Introduce calibrated scorecards and a lightweight skills validation step for priority roles.',
      },
      'readiness',
    ),
    mk(
      {
        idSuffix: 'external_connections',
        title: 'Active External Connections',
        valueText: '1,142',
        valueNum: 1142,
        thresholdText: '> 1,000',
        rag: 'green',
        icon: 'hub',
        alarm: 'Network coverage is healthy; maintain cadence to avoid decay.',
        insight: 'Pipeline activity is strong and should convert if downstream SLAs hold.',
        action: 'Keep weekly outreach targets; prioritize roles with low qualified pool.',
      },
      'readiness',
    ),
    mk(
      {
        idSuffix: 'critical_skill_capability',
        title: 'Critical Skill Hiring Capability',
        valueText: '84%',
        valueNum: 84,
        unit: '%',
        thresholdText: '> 90%',
        rag: 'red',
        icon: 'military_tech',
        alarm: 'Critical skill capability is below target; risk of delivery slippage.',
        insight: 'Specialist roles have a slower conversion rate and higher offer decline sensitivity.',
        action: 'Tighten req intake, fast-track specialist interview loops, and deploy senior sourcers.',
      },
      'readiness',
    ),
    mk(
      {
        idSuffix: 'time_to_present',
        title: 'Time to Present Critical Skills',
        valueText: '8.6 days',
        valueNum: 8.6,
        unit: 'days',
        thresholdText: '< 7.0 days',
        rag: 'red',
        icon: 'timer',
        alarm: 'Likely to breach slate SLA within 7 days for critical reqs.',
        insight: 'Sourcing-to-slate latency is elevated; bottleneck appears in shortlist review and scheduling.',
        action: 'Set a 48-hour shortlist review SLA and pre-book interview blocks for priority roles.',
      },
      'readiness',
    ),
    mk(
      {
        idSuffix: 'pool_variety',
        title: 'Talent Pool Size & Variety',
        valueText: '+7.4%',
        valueNum: 7.4,
        unit: '%',
        thresholdText: '> 10%',
        rag: 'amber',
        icon: 'bar_chart',
        alarm: 'Variety growth is slowing; expansion may stall next quarter.',
        insight: 'Diversity of profiles is increasing but concentrated in a small set of sources.',
        action: 'Add two new sourcing channels and run a niche campaign for under-covered skill clusters.',
      },
      'readiness',
    ),
  ],
  momentum: [
    mk(
      {
        idSuffix: 'time_to_next_step',
        title: 'Time to Next Step Decision',
        valueText: '4.1 days',
        valueNum: 4.1,
        unit: 'days',
        thresholdText: '< 5.0 days',
        rag: 'amber',
        icon: 'fact_check',
        alarm: 'Decision latency is trending upward; candidate drop-off risk rising.',
        insight: 'Hiring manager feedback loop is the primary delay driver in top-volume roles.',
        action: 'Enforce a 48-hour feedback SLA; escalate aging feedback to leadership weekly.',
      },
      'momentum',
    ),
    mk(
      {
        idSuffix: 'time_spent_matching',
        title: 'Time Spent Matching',
        valueText: '6.2 hrs',
        valueNum: 6.2,
        unit: 'hrs',
        thresholdText: '< 6.0 hrs',
        rag: 'amber',
        icon: 'join_inner',
        alarm: 'Matching time is near limit; efficiency is softening.',
        insight: 'Manual matching is taking longer for specialist roles and multi-location reqs.',
        action: 'Standardize skill tags and add assisted matching for priority requisitions.',
      },
      'momentum',
    ),
    mk(
      {
        idSuffix: 'time_to_cv_response',
        title: 'Time to CV Response',
        valueText: '27.4 hrs',
        valueNum: 27.4,
        unit: 'hrs',
        thresholdText: '< 24 hrs',
        rag: 'amber',
        icon: 'quickreply',
        alarm: 'Response SLA is at risk in peak volumes.',
        insight: 'Candidate response time is uneven across geographies; weekend coverage gap is visible.',
        action: 'Enable auto-acknowledgement and add on-call triage during spikes.',
      },
      'momentum',
    ),
    mk(
      {
        idSuffix: 'recruiting_experience_rating',
        title: 'Recruiting Experience Rating',
        valueText: '4.6 / 5',
        valueNum: 4.6,
        thresholdText: '> 4.2',
        rag: 'green',
        icon: 'star',
        alarm: 'Experience is strong; protect it during scale hiring.',
        insight: 'Positive sentiment correlates with faster scheduling and clearer status updates.',
        action: 'Keep the comms cadence consistent; automate status updates at every stage.',
      },
      'momentum',
    ),
  ],
  experience: [
    mk(
      {
        idSuffix: 'incomplete_applications',
        title: 'Incomplete Applications',
        valueText: '22.8%',
        valueNum: 22.8,
        unit: '%',
        thresholdText: '< 20%',
        rag: 'red',
        icon: 'error_outline',
        alarm: 'Drop-off is high on mobile; conversion risk is immediate.',
        insight: 'Candidates abandon mid-flow; form friction is likely around uploads and prior employment fields.',
        action: 'Reduce steps, delay optional fields, and improve mobile upload reliability.',
      },
      'experience',
    ),
    mk(
      {
        idSuffix: 'time_to_apply',
        title: 'Time to Apply',
        valueText: '9.1 mins',
        valueNum: 9.1,
        unit: 'mins',
        thresholdText: '< 10 mins',
        rag: 'green',
        icon: 'schedule',
        alarm: 'Time-to-apply is within range; focus on drop-off drivers.',
        insight:
          'Applicants who complete do so quickly; the issue is not overall time but specific friction points.',
        action: 'Instrument step-level abandonment and A/B test the highest-drop step.',
      },
      'experience',
    ),
    mk(
      {
        idSuffix: 'ease_of_applying',
        title: 'Ease of Applying Rating',
        valueText: '3.9 / 5',
        valueNum: 3.9,
        thresholdText: '> 4.0',
        rag: 'amber',
        icon: 'sentiment_satisfied',
        alarm: 'Ease score is slightly below target; likely to impact volume quality.',
        insight: 'Applicants report confusion on document requirements and status visibility.',
        action: 'Clarify required docs early and add progress feedback with clear completion states.',
      },
      'experience',
    ),
  ],
  diversity: [
    mk(
      {
        idSuffix: 'diverse_attraction',
        title: 'Gender Diversity in Attraction',
        valueText: 'F 38.4% / M 61.6%',
        valueNum: 38.4,
        unit: '%',
        thresholdText: '> 40%',
        rag: 'amber',
        icon: 'favorite',
        alarm: 'Attraction is close to target; avoid backsliding in new channels.',
        insight: 'Top sources perform well; long tail sources underperform and dilute conversion.',
        action: 'Double down on top 3 sources and refine targeting for the long tail.',
      },
      'diversity',
    ),
    mk(
      {
        idSuffix: 'diverse_pipeline',
        title: 'Gender Diversity in Pipeline',
        valueText: 'F 29.7% / M 70.3%',
        valueNum: 29.7,
        unit: '%',
        thresholdText: '> 40%',
        rag: 'red',
        icon: 'timeline',
        alarm: 'Pipeline parity is weak; late-stage conversion is leaking.',
        insight: 'Female candidates progress more slowly beyond interview; feedback and scheduling delays amplify loss.',
        action: 'Standardize interview panels and run weekly parity reviews by stage.',
      },
      'diversity',
    ),
    mk(
      {
        idSuffix: 'active_applicants',
        title: 'Active Applicants',
        valueText: '12,430',
        valueNum: 12430,
        thresholdText: '> 8,000',
        rag: 'green',
        icon: 'person_search',
        alarm: 'Inbound volume is strong; protect quality and throughput.',
        insight: 'High volume can mask bottlenecks; monitor stage aging and response SLAs.',
        action: 'Add triage rules and prioritize candidates for critical requisitions.',
      },
      'diversity',
    ),
  ],
  economics: [
    mk(
      {
        idSuffix: 'cost_per_acquisition',
        title: 'Cost per Acquisition',
        valueText: 'AED 11,524',
        valueNum: 11524,
        thresholdText: '< AED 14,700',
        rag: 'amber',
        icon: 'account_balance_wallet',
        alarm: 'CPA is above budget; savings required this month.',
        insight: 'Agency mix and low conversion in two channels are driving elevated cost.',
        action: 'Reduce agency usage on non-critical roles and shift spend to best-performing sources.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'presented_vs_offers',
        title: 'Candidates Presented vs Offers Made',
        valueText: '19.6%',
        valueNum: 19.6,
        unit: '%',
        thresholdText: '> 25%',
        rag: 'amber',
        icon: 'check_circle',
        alarm: 'Shortlist yield is soft; screening precision needs tightening.',
        insight: 'Too many candidates reach panels without meeting must-have criteria.',
        action: 'Add must-have gating and calibrate shortlisting to reduce false positives.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'job_posting_effectiveness',
        title: 'Job Posting Effectiveness',
        valueText: '7.1%',
        valueNum: 7.1,
        unit: '%',
        thresholdText: '> 8%',
        rag: 'amber',
        icon: 'campaign',
        alarm: 'Posting conversion is slightly under target; quality mix may be shifting.',
        insight: 'Views are high but qualified apply rate is falling; JD clarity may be the culprit.',
        action: 'Rewrite JDs for clarity, add salary/benefits transparency, and tune channel targeting.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'hires_from_competitors',
        title: 'Hires from Competitors',
        valueText: '14.2%',
        valueNum: 14.2,
        unit: '%',
        thresholdText: '> 15%',
        rag: 'amber',
        icon: 'transfer_within_a_station',
        alarm: 'Competitive capture is close to target; watch offer competitiveness.',
        insight: 'Offer acceptances from competitor talent dip when time-to-offer increases.',
        action: 'Accelerate offer approvals and standardize compensation guardrails for key roles.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'hm_feedback_time',
        title: 'Hiring Manager Feedback Time',
        valueText: '2.8 days',
        valueNum: 2.8,
        unit: 'days',
        thresholdText: '< 2.0 days',
        rag: 'red',
        icon: 'comment',
        alarm: 'Feedback SLA breached in multiple functions; throughput impact is material.',
        insight: 'Aging feedback correlates with lower offer acceptance and higher re-screen volume.',
        action: 'Introduce leaderboards, reminders, and escalation for aging feedback over 48 hours.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'jd_criteria_match',
        title: 'JD Criteria Match',
        valueText: '73%',
        valueNum: 73,
        unit: '%',
        thresholdText: '> 75%',
        rag: 'amber',
        icon: 'rule',
        alarm: 'Criteria alignment is slightly low; panel time may be wasted.',
        insight: 'Mismatch is driven by ambiguous JDs and inconsistent must-have interpretation.',
        action: 'Rebaseline must-haves and add a structured screening checklist per role family.',
      },
      'economics',
    ),
    mk(
      {
        idSuffix: 'interviewed_vs_offered',
        title: 'Interviewed vs Offered Ratio',
        valueText: '1 : 3.2',
        thresholdText: 'Target 1 : 4',
        rag: 'green',
        icon: 'assignment_ind',
        alarm: 'Yield is healthy; maintain consistency across panels.',
        insight: 'Offer conversion is stable; focus improvements on upstream screening accuracy.',
        action: 'Keep calibration sessions monthly; document panel decision patterns.',
      },
      'economics',
    ),
  ],
}

export function sortRag(rag: Rag) {
  if (rag === 'red') return 0
  if (rag === 'amber') return 1
  return 2
}

export function summarizeKeyInsights(all: Metric[]): KeyInsight[] {
  // Avoid generating insights from unavailable KPIs.
  const available = all.filter((m) => typeof m.valueNum === 'number')
  const ordered = [...available].sort((a, b) => {
    const ragDiff = sortRag(a.rag) - sortRag(b.rag)
    if (ragDiff !== 0) return ragDiff
    // Tie-breaker: surface the biggest gap-to-target first.
    const ga = gapToTargetText(a) ?? ''
    const gb = gapToTargetText(b) ?? ''
    return gb.localeCompare(ga)
  })
  return ordered.slice(0, 4).map((m) => ({
    metricId: m.id,
    title: m.title,
    text:
      typeof m.valueNum === 'number'
        ? `${ragLabel(m.rag)}: ${m.valueText} vs ${m.thresholdText}${gapToTargetText(m) ? ` (${gapToTargetText(m)})` : ''}`
        : m.alarm,
    rag: m.rag,
    icon: m.icon,
  }))
}
