import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

class RNG {
  constructor(seed = 123456789) {
    this.state = seed >>> 0
  }

  next() {
    // xorshift32
    let x = this.state
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.state = x >>> 0
    return this.state / 0xffffffff
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick(arr) {
    return arr[this.int(0, arr.length - 1)]
  }

  chance(p) {
    return this.next() < p
  }
}

const CONFIG = {
  seed: 20260211,
  requisitions: 8000,
  candidates: 140000,
  pipeline: 120000,
  recruiterActivity: 180000,
  interviewOffer: 90000,
}

const ROLE_CATALOG = [
  { role: 'Captain', skill: 'Flight Operations', critical: true },
  { role: 'First Officer', skill: 'Flight Operations', critical: true },
  { role: 'Aircraft Maintenance Engineer', skill: 'Maintenance', critical: true },
  { role: 'Avionics Specialist', skill: 'Avionics', critical: true },
  { role: 'Flight Dispatcher', skill: 'Operations Control', critical: true },
  { role: 'Air Traffic Liaison', skill: 'Operational Coordination', critical: true },
  { role: 'Cabin Crew', skill: 'Service Excellence', critical: false },
  { role: 'Ground Operations Manager', skill: 'Ground Ops', critical: false },
  { role: 'Cargo Operations Analyst', skill: 'Cargo Planning', critical: false },
  { role: 'Revenue Management Analyst', skill: 'Network Economics', critical: false },
  { role: 'Digital Product Manager', skill: 'Digital Platforms', critical: false },
  { role: 'Data Engineer', skill: 'Data Platforms', critical: true },
  { role: 'Cybersecurity Analyst', skill: 'Security Operations', critical: true },
  { role: 'Airport Customer Experience Lead', skill: 'Customer Experience', critical: false },
  { role: 'Procurement Specialist', skill: 'Strategic Sourcing', critical: false },
  { role: 'HR Business Partner', skill: 'Talent Strategy', critical: false },
]

const BUSINESS_UNITS = [
  'Airline Operations',
  'Flight Operations',
  'Engineering & Maintenance',
  'Ground Services',
  'Commercial',
  'Corporate',
  'Digital & Data',
  'Customer Experience',
]

const LOCATIONS = [
  'Australia',
  'Singapore',
  'India',
  'UAE',
  'UK',
  'USA',
  'Germany',
  'Canada',
  'Japan',
  'Qatar',
]

const SOURCES = [
  { value: 'Agency', weight: 0.2 },
  { value: 'Referral', weight: 0.18 },
  { value: 'Direct', weight: 0.2 },
  { value: 'LinkedIn', weight: 0.26 },
  { value: 'Career Site', weight: 0.16 },
]

const INTERACTION_TYPES = ['Outreach', 'Screening', 'Follow-up', 'Interview Coordination', 'Offer Discussion']
const STAGES_ACTIVE = ['Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Background Check']
const STAGES_REJECTED = ['Screen Rejected', 'Assessment Rejected', 'Interview Rejected']

const PERIOD_START = new Date('2024-01-01T00:00:00Z')
const PERIOD_END = new Date('2025-12-31T23:59:59Z')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function pad(num, width) {
  return String(num).padStart(width, '0')
}

function formatDate(d) {
  const y = d.getUTCFullYear()
  const m = pad(d.getUTCMonth() + 1, 2)
  const day = pad(d.getUTCDate(), 2)
  return `${y}-${m}-${day}`
}

function formatDateTime(d) {
  const y = d.getUTCFullYear()
  const m = pad(d.getUTCMonth() + 1, 2)
  const day = pad(d.getUTCDate(), 2)
  const hh = pad(d.getUTCHours(), 2)
  const mm = pad(d.getUTCMinutes(), 2)
  const ss = pad(d.getUTCSeconds(), 2)
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}Z`
}

function addDays(date, days) {
  const out = new Date(date.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function clampDate(d, minDate, maxDate) {
  if (d < minDate) return new Date(minDate.getTime())
  if (d > maxDate) return new Date(maxDate.getTime())
  return d
}

function weightedPick(rng, weighted) {
  let t = 0
  for (const w of weighted) t += w.weight
  const r = rng.next() * t
  let c = 0
  for (const w of weighted) {
    c += w.weight
    if (r <= c) return w.value
  }
  return weighted[weighted.length - 1].value
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function createCsvWriter(filePath, headers) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' })
  stream.write(`${headers.map(csvEscape).join(',')}\n`)
  return {
    writeRow(row) {
      const line = headers.map((h) => csvEscape(row[h])).join(',')
      stream.write(`${line}\n`)
    },
    close() {
      return new Promise((resolve, reject) => {
        stream.end(() => resolve())
        stream.on('error', reject)
      })
    },
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[idx]
}

async function main() {
  const rng = new RNG(CONFIG.seed)
  const outDir = path.resolve('generated/test-data')
  ensureDir(outDir)

  const reqHeaders = [
    'Requisition_ID',
    'Role_Name',
    'Critical_Skill_Flag (Y/N)',
    'Business_Unit',
    'Location',
    'Open_Date',
    'Close_Date',
    'Skills_Required',
    'Hiring_Manager_ID',
    'Budgeted_Cost',
  ]
  const candHeaders = [
    'Candidate_ID',
    'Source',
    'Current_Employer',
    'Is_Competitor (Y/N)',
    'Diversity_Flag',
    'Primary_Skills',
    'Skillset_Category',
    'Secondary_Skills',
    'Skill_Proficiency_Level',
    'Transferrable skillset',
    'Transferable_Skill_Match_%',
    'Future_Readiness_Score',
    'Application_Start_Time',
    'Application_Submit_Time',
    'Application_Completed (Y/N)',
    'Application_Ease_Rating',
    'Candidate_NPS',
    'Candidate Type (Internal/External)',
    'Skill_Match_Percentage',
    'Availability_Window',
    'Bench_Strength_Tag',
    'Mobility_Preference',
    'Upskilling_Interest (Y/N)',
  ]
  const pipelineHeaders = [
    'Application_ID',
    'Candidate_ID',
    'Requisition_ID',
    'Application_Date',
    'Current_Stage',
    'Stage_Enter_Date',
    'Stage_Exit_Date',
    'CV_Submission_Time',
    'Recruiter_Response_Time',
    'Status (Active/Rejected/Hired)',
  ]
  const activityHeaders = [
    'Recruiter_ID',
    'Candidate_ID',
    'Interaction_Type',
    'Interaction_Date',
    'Time_Spent_Matching (hrs)',
  ]
  const interviewHeaders = [
    'Interview_ID',
    'Candidate_ID',
    'Interview_Date',
    'Feedback_Date',
    'Offer_Made (Y/N)',
    'Offer_Date',
    'Offer_Accepted (Y/N)',
  ]
  const costHeaders = [
    'Requisition_ID',
    'Advertising_Cost',
    'Agency_Fee',
    'Technology_Cost',
    'Recruiter_Cost',
    'Total_Hiring_Cost',
  ]
  const postingHeaders = ['Job_ID', 'Job_Views', 'Applications_Received', 'Posting_Date']

  const writers = {
    requisition: createCsvWriter(path.join(outDir, '1_Requisition.csv'), reqHeaders),
    candidate: createCsvWriter(path.join(outDir, '2_Candidate.csv'), candHeaders),
    pipeline: createCsvWriter(path.join(outDir, '3_Application_Pipeline.csv'), pipelineHeaders),
    activity: createCsvWriter(path.join(outDir, '4_Recruiter_Activity.csv'), activityHeaders),
    interview: createCsvWriter(path.join(outDir, '5_Interview_Offer.csv'), interviewHeaders),
    cost: createCsvWriter(path.join(outDir, '6_Hiring_Cost.csv'), costHeaders),
    posting: createCsvWriter(path.join(outDir, '7_Job_Posting_Analytics.csv'), postingHeaders),
  }

  const reqIds = []
  const reqMeta = new Map()
  const candidateIds = []
  const candidateMeta = new Map()
  const appCountByReq = new Map()
  const pipelineFacts = []
  const firstAppByCandidate = new Map()

  // Sheet 1: Requisition
  for (let i = 1; i <= CONFIG.requisitions; i++) {
    const id = `REQ${pad(i, 6)}`
    const role = rng.pick(ROLE_CATALOG)
    const businessUnit = rng.pick(BUSINESS_UNITS)
    const location = rng.pick(LOCATIONS)
    const openDate = addDays(PERIOD_START, rng.int(0, 700))
    const closeDate = rng.chance(0.22) ? null : addDays(openDate, rng.int(30, 180))
    const baseCost = role.critical ? rng.int(25000, 52000) : rng.int(14000, 34000)
    const row = {
      Requisition_ID: id,
      Role_Name: role.role,
      'Critical_Skill_Flag (Y/N)': role.critical || rng.chance(0.12) ? 'Y' : 'N',
      Business_Unit: businessUnit,
      Location: location,
      Open_Date: formatDate(openDate),
      Close_Date: closeDate ? formatDate(closeDate) : '',
      Skills_Required: `${role.skill} Core Skills`,
      Hiring_Manager_ID: `HM${pad(rng.int(1000, 9999), 4)}`,
      Budgeted_Cost: baseCost,
    }
    writers.requisition.writeRow(row)
    reqIds.push(id)
    reqMeta.set(id, {
      role: row.Role_Name,
      skill: role.skill,
      criticalFlag: row['Critical_Skill_Flag (Y/N)'],
      openDate,
      closeDate,
      budgetedCost: baseCost,
    })
  }

  // Sheet 2: Candidate
  for (let i = 1; i <= CONFIG.candidates; i++) {
    const id = `CAN${pad(i, 7)}`
    const source = weightedPick(rng, SOURCES)
    const candidateType = rng.chance(0.22) ? 'Internal' : 'External'
    const competitor = candidateType === 'External' && rng.chance(0.3)
    const diversity = rng.chance(0.37)
    const skillDef = rng.pick(ROLE_CATALOG)
    const start = addDays(PERIOD_START, rng.int(0, 720))
    start.setUTCHours(rng.int(7, 21), rng.int(0, 59), 0, 0)
    const submit = addDays(start, 0)
    submit.setUTCMinutes(submit.getUTCMinutes() + rng.int(10, 120))
    const completed = rng.chance(0.83)
    const skillMatch = rng.int(55, 100)

    const row = {
      Candidate_ID: id,
      Source: source,
      Current_Employer: candidateType === 'Internal' ? 'Internal Airline Group' : rng.pick(['External Org', 'Competitor Airline', 'Logistics Co', 'Tech Vendor']),
      'Is_Competitor (Y/N)': competitor ? 'Y' : 'N',
      Diversity_Flag: diversity ? 'Y' : 'N',
      Primary_Skills: skillDef.role,
      Skillset_Category: skillDef.skill,
      Secondary_Skills: rng.pick(['Safety & Compliance, Service Recovery', 'Analytics, Planning', 'Operations Coordination, Process Improvement', 'Systems, Reliability']),
      Skill_Proficiency_Level: rng.pick(['Intermediate', 'Advanced', 'Expert']),
      'Transferrable skillset': rng.pick(['Process Improvement, Customer Experience', 'Risk Management, Communication', 'Stakeholder Management, Data Literacy', 'Operational Excellence, Leadership']),
      'Transferable_Skill_Match_%': rng.int(50, 98),
      Future_Readiness_Score: rng.int(45, 98),
      Application_Start_Time: formatDateTime(start),
      Application_Submit_Time: formatDateTime(submit),
      'Application_Completed (Y/N)': completed ? 'Y' : 'N',
      Application_Ease_Rating: completed ? rng.int(3, 5) : rng.int(2, 4),
      Candidate_NPS: completed ? rng.int(6, 10) : rng.int(5, 9),
      'Candidate Type (Internal/External)': candidateType,
      Skill_Match_Percentage: skillMatch,
      Availability_Window: rng.pick(['Immediate', '2 Weeks', '1 Month', '2-3 Months']),
      Bench_Strength_Tag: rng.pick(['Hot', 'Warm', 'Cold']),
      Mobility_Preference: rng.pick(['Willing to Relocate', 'Remote Preferred', 'No Relocation']),
      'Upskilling_Interest (Y/N)': rng.chance(0.62) ? 'Y' : 'N',
    }
    writers.candidate.writeRow(row)
    candidateIds.push(id)
    candidateMeta.set(id, {
      source,
      candidateType,
      diversityFlag: row.Diversity_Flag,
      skillMatch,
    })
  }

  // Sheet 3: Application Pipeline
  for (let i = 1; i <= CONFIG.pipeline; i++) {
    const appId = `APP${pad(i, 7)}`
    const candidateId = rng.pick(candidateIds)
    const reqId = rng.pick(reqIds)
    const req = reqMeta.get(reqId)

    const maxLag = req.closeDate ? Math.max(2, Math.floor((req.closeDate - req.openDate) / 86400000)) : 220
    const appDate = clampDate(addDays(req.openDate, rng.int(0, Math.min(maxLag, 240))), PERIOD_START, PERIOD_END)

    const statusRoll = rng.next()
    let status = 'Active'
    if (statusRoll < 0.17) status = 'Hired'
    else if (statusRoll < 0.43) status = 'Rejected'

    let stage = 'Applied'
    if (status === 'Hired') stage = 'Hired'
    else if (status === 'Rejected') stage = rng.pick(STAGES_REJECTED)
    else stage = rng.pick(STAGES_ACTIVE)

    const stageEnterDate = addDays(appDate, rng.int(0, 14))
    const stageExitDate = status === 'Active' && rng.chance(0.55) ? null : addDays(stageEnterDate, rng.int(1, 18))
    const cvSubmissionHours = rng.int(6, 72)
    const recruiterResponseHours = rng.int(4, 96)

    const row = {
      Application_ID: appId,
      Candidate_ID: candidateId,
      Requisition_ID: reqId,
      Application_Date: formatDate(appDate),
      Current_Stage: stage,
      Stage_Enter_Date: formatDate(stageEnterDate),
      Stage_Exit_Date: stageExitDate ? formatDate(stageExitDate) : '',
      CV_Submission_Time: cvSubmissionHours,
      Recruiter_Response_Time: recruiterResponseHours,
      'Status (Active/Rejected/Hired)': status,
    }
    writers.pipeline.writeRow(row)

    appCountByReq.set(reqId, (appCountByReq.get(reqId) ?? 0) + 1)
    if (!firstAppByCandidate.has(candidateId) || appDate < firstAppByCandidate.get(candidateId)) {
      firstAppByCandidate.set(candidateId, appDate)
    }

    pipelineFacts.push({
      appId,
      candidateId,
      reqId,
      applicationDate: appDate,
      stageEnterDate,
      stageExitDate,
      status,
      currentStage: stage,
    })
  }

  // Sheet 4: Recruiter Activity
  for (let i = 1; i <= CONFIG.recruiterActivity; i++) {
    const candidateId = rng.pick(candidateIds)
    const base = firstAppByCandidate.get(candidateId) ?? addDays(PERIOD_START, rng.int(0, 700))
    const interactionDate = clampDate(addDays(base, rng.int(-10, 70)), PERIOD_START, PERIOD_END)
    writers.activity.writeRow({
      Recruiter_ID: `REC${pad(rng.int(1, 850), 3)}`,
      Candidate_ID: candidateId,
      Interaction_Type: rng.pick(INTERACTION_TYPES),
      Interaction_Date: formatDate(interactionDate),
      'Time_Spent_Matching (hrs)': (rng.int(5, 80) / 10).toFixed(1),
    })
  }

  // Sheet 5: Interview Offer
  for (let i = 1; i <= CONFIG.interviewOffer; i++) {
    const fact = rng.pick(pipelineFacts)
    const interviewDate = addDays(fact.applicationDate, rng.int(2, 35))
    const feedbackDate = addDays(interviewDate, rng.int(0, 6))
    const offerMade = fact.status === 'Hired' ? true : fact.status === 'Rejected' ? rng.chance(0.15) : rng.chance(0.38)
    const offerDate = offerMade ? addDays(feedbackDate, rng.int(0, 8)) : null
    const offerAccepted = offerMade ? (fact.status === 'Hired' ? rng.chance(0.92) : rng.chance(0.28)) : null

    writers.interview.writeRow({
      Interview_ID: `INT${pad(i, 6)}`,
      Candidate_ID: fact.candidateId,
      Interview_Date: formatDate(interviewDate),
      Feedback_Date: formatDate(feedbackDate),
      'Offer_Made (Y/N)': offerMade ? 'Y' : 'N',
      Offer_Date: offerDate ? formatDate(offerDate) : '',
      'Offer_Accepted (Y/N)': offerAccepted == null ? '' : offerAccepted ? 'Y' : 'N',
    })
  }

  // Sheet 6 + 7: Hiring cost and posting analytics
  for (let i = 0; i < reqIds.length; i++) {
    const reqId = reqIds[i]
    const req = reqMeta.get(reqId)
    const appCount = appCountByReq.get(reqId) ?? 0

    const advertising = rng.int(1000, 9000)
    const agency = req.criticalFlag === 'Y' ? rng.int(8000, 34000) : rng.int(2000, 18000)
    const tech = rng.int(1200, 8000)
    const recruiter = rng.int(1800, 12000)
    const total = advertising + agency + tech + recruiter

    writers.cost.writeRow({
      Requisition_ID: reqId,
      Advertising_Cost: advertising,
      Agency_Fee: agency,
      Technology_Cost: tech,
      Recruiter_Cost: recruiter,
      Total_Hiring_Cost: total,
    })

    const views = Math.max(120, appCount * rng.int(3, 22) + rng.int(0, 2200))
    writers.posting.writeRow({
      Job_ID: reqId,
      Job_Views: views,
      Applications_Received: appCount,
      Posting_Date: formatDate(req.openDate),
    })
  }

  await Promise.all([
    writers.requisition.close(),
    writers.candidate.close(),
    writers.pipeline.close(),
    writers.activity.close(),
    writers.interview.close(),
    writers.cost.close(),
    writers.posting.close(),
  ])

  // QA summary
  let withResponse24h = 0
  let hiredCount = 0
  let activeCount = 0
  let rejectedCount = 0
  let qualifiedCritical = 0
  let criticalReqCount = 0
  const criticalReqWithQualified = new Set()
  const openReqIds = new Set()
  const stageAging = []
  const diverseApply = { yes: 0, total: 0 }
  const diverseHire = { yes: 0, total: 0 }

  const candidateSet = new Set(candidateIds)
  const reqSet = new Set(reqIds)
  let missingCandidateRefs = 0
  let missingReqRefs = 0

  for (const reqId of reqIds) {
    const req = reqMeta.get(reqId)
    if (!req.closeDate || req.closeDate > PERIOD_END) openReqIds.add(reqId)
    if (req.criticalFlag === 'Y') criticalReqCount++
  }

  for (const f of pipelineFacts) {
    if (!candidateSet.has(f.candidateId)) missingCandidateRefs++
    if (!reqSet.has(f.reqId)) missingReqRefs++

    const req = reqMeta.get(f.reqId)
    const cand = candidateMeta.get(f.candidateId)

    const response = null // not stored in facts; sampled in generation but not needed for QA strictness
    if (response != null && response <= 24) withResponse24h++

    if (f.status === 'Hired') hiredCount++
    else if (f.status === 'Active') activeCount++
    else rejectedCount++

    if (f.stageExitDate) {
      const days = Math.max(0, Math.round((f.stageExitDate - f.stageEnterDate) / 86400000))
      stageAging.push(days)
    }

    if (cand) {
      diverseApply.total++
      if (cand.diversityFlag === 'Y') diverseApply.yes++
      if (f.status === 'Hired') {
        diverseHire.total++
        if (cand.diversityFlag === 'Y') diverseHire.yes++
      }
    }

    if (req?.criticalFlag === 'Y' && cand && cand.skillMatch >= 80) {
      qualifiedCritical++
      criticalReqWithQualified.add(f.reqId)
    }
  }

  stageAging.sort((a, b) => a - b)
  const p50 = percentile(stageAging, 0.5)
  const p90 = percentile(stageAging, 0.9)

  const qa = {
    generatedAt: new Date().toISOString(),
    seed: CONFIG.seed,
    counts: {
      requisition: CONFIG.requisitions,
      candidate: CONFIG.candidates,
      applicationPipeline: CONFIG.pipeline,
      recruiterActivity: CONFIG.recruiterActivity,
      interviewOffer: CONFIG.interviewOffer,
      hiringCost: CONFIG.requisitions,
      jobPostingAnalytics: CONFIG.requisitions,
    },
    integrity: {
      missingCandidateRefs,
      missingRequisitionRefs: missingReqRefs,
      candidateJoinCoveragePct: ((CONFIG.pipeline - missingCandidateRefs) / CONFIG.pipeline) * 100,
      requisitionJoinCoveragePct: ((CONFIG.pipeline - missingReqRefs) / CONFIG.pipeline) * 100,
    },
    stageAgingDays: {
      sampleSize: stageAging.length,
      p50,
      p90,
      min: stageAging.length ? stageAging[0] : null,
      max: stageAging.length ? stageAging[stageAging.length - 1] : null,
    },
    kpiSamples: {
      qualifiedCandidatesAvailability: {
        qualifiedCriticalCandidates: qualifiedCritical,
        criticalReqCount,
        value: criticalReqCount ? qualifiedCritical / criticalReqCount : null,
      },
      criticalReqWithQualifiedPct: criticalReqCount ? (criticalReqWithQualified.size / criticalReqCount) * 100 : null,
      diverseApplyPct: diverseApply.total ? (diverseApply.yes / diverseApply.total) * 100 : null,
      diverseHirePct: diverseHire.total ? (diverseHire.yes / diverseHire.total) * 100 : null,
      parityIndex:
        diverseApply.total && diverseHire.total
          ? (diverseHire.yes / diverseHire.total) / (diverseApply.yes / diverseApply.total)
          : null,
      statusMixPct: {
        active: (activeCount / CONFIG.pipeline) * 100,
        rejected: (rejectedCount / CONFIG.pipeline) * 100,
        hired: (hiredCount / CONFIG.pipeline) * 100,
      },
      openRequisitionCount: openReqIds.size,
    },
    notes: [
      'All pipeline Candidate_ID values are sampled from 2_Candidate.',
      'All pipeline Requisition_ID values are sampled from 1_Requisition.',
      'Date sequences are constrained to avoid negative stage durations.',
    ],
    outputDir: outDir,
  }

  fs.writeFileSync(path.join(outDir, 'qa_report.json'), JSON.stringify(qa, null, 2), 'utf8')

  // Build a single multi-sheet XLSX from generated CSVs for direct dashboard upload.
  const workbook = XLSX.utils.book_new()
  const csvToSheet = (fileName) => {
    const csv = fs.readFileSync(path.join(outDir, fileName), 'utf8')
    const parsed = XLSX.read(csv, { type: 'string' })
    return parsed.Sheets[parsed.SheetNames[0]]
  }
  XLSX.utils.book_append_sheet(workbook, csvToSheet('1_Requisition.csv'), '1_Requisition')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('2_Candidate.csv'), '2_Candidate')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('3_Application_Pipeline.csv'), '3_Application_Pipeline')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('4_Recruiter_Activity.csv'), '4_Recruiter_Activity')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('5_Interview_Offer.csv'), '5_Interview_Offer')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('6_Hiring_Cost.csv'), '6_Hiring_Cost')
  XLSX.utils.book_append_sheet(workbook, csvToSheet('7_Job_Posting_Analytics.csv'), '7_Job_Posting_Analytics')
  const xlsxPath = path.join(outDir, 'Data for Cockpit - curated.xlsx')
  XLSX.writeFile(workbook, xlsxPath)

  console.log(JSON.stringify(qa, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
