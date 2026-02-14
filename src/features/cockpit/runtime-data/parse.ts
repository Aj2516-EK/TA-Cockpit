import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { ApplicationFactRow, Dataset, DatasetDiagnostics, RawTableRow, RawTables } from './types'

function toTrimmedString(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function toYNBool(v: unknown): boolean | null {
  const s = toTrimmedString(v)?.toUpperCase()
  if (s === 'Y' || s === 'YES' || s === 'TRUE') return true
  if (s === 'N' || s === 'NO' || s === 'FALSE') return false
  return null
}

function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date && Number.isFinite(v.getTime())) return new Date(v.getTime())
  // xlsx often gives ISO yyyy-mm-dd strings when defval/raw settings vary
  const s = toTrimmedString(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function pickTable(tables: RawTables, name: string): RawTableRow[] {
  return tables[name] ?? []
}

function getCandidateType(v: unknown): 'Internal' | 'External' | null {
  const s = toTrimmedString(v)
  if (!s) return null
  const norm = s.toLowerCase()
  if (norm.includes('internal')) return 'Internal'
  if (norm.includes('external')) return 'External'
  return null
}

export async function parseUploadToDataset(file: File): Promise<Dataset> {
  const name = file.name
  const loadedAt = new Date()

  const lower = name.toLowerCase()
  if (lower.endsWith('.csv')) {
    const text = await file.text()
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    })
    if (parsed.errors?.length) {
      // Keep the first error message for UI.
      throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? 'Unknown error'}`)
    }

    // CSV upload is treated as already being the canonical fact table.
    const rows = (parsed.data ?? []).map((raw) => normalizeFactRowFromCsv(raw))
    const nonNullRows = rows.filter((r): r is ApplicationFactRow => r != null)
    const columns = Object.keys(parsed.data?.[0] ?? {})
    const diagnostics: DatasetDiagnostics = {
      kind: 'csv',
      warnings: [],
    }
    return { name, loadedAt, rows: nonNullRows, columns, diagnostics }
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: true })

    const tables: RawTables = {}
    const expectedSheets = new Set([
      '1_Requisition',
      '2_Candidate',
      '3_Application_Pipeline',
      '4_Recruiter_Activity',
      '5_Interview_Offer',
      '6_Hiring_Cost',
      '7_Job_Posting_Analytics',
    ])
    const sheetNamesToParse = wb.SheetNames.filter((name) => expectedSheets.has(name))
    const finalSheetNames = sheetNamesToParse.length > 0 ? sheetNamesToParse : wb.SheetNames

    for (const sheetName of finalSheetNames) {
      const ws = wb.Sheets[sheetName]
      // raw=false helps ensure dates appear as strings when not cellDates, but we handle both.
      tables[sheetName] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false }) as RawTableRow[]
    }

    const { rows: factRows, diagnostics } = normalizeFactRowsFromCockpitWorkbook(tables)
    const columns = Object.keys(factRows[0] ?? {})
    return { name, loadedAt, rows: factRows, columns, diagnostics }
  }

  throw new Error('Unsupported file type. Please upload .xlsx or .csv.')
}

function normalizeFactRowFromCsv(raw: RawTableRow): ApplicationFactRow | null {
  // Best-effort mapping for ad-hoc CSVs; primary demo is XLSX.
  const candidateId = toTrimmedString(raw['Candidate_ID'] ?? raw['candidate_id'] ?? raw['CandidateId'])
  const requisitionId = toTrimmedString(raw['Requisition_ID'] ?? raw['requisition_id'] ?? raw['RequisitionId'])
  const applicationId = toTrimmedString(raw['Application_ID'] ?? raw['application_id'] ?? raw['ApplicationId'])

  const statusRaw = toTrimmedString(raw['Status'] ?? raw['Status (Active/Rejected/Hired)'])
  const status =
    statusRaw === 'Active' || statusRaw === 'Rejected' || statusRaw === 'Hired' ? statusRaw : null

  return {
    applicationId,
    candidateId,
    requisitionId,
    applicationDate: toDate(raw['Application_Date'] ?? raw['application_date']),
    currentStage: toTrimmedString(raw['Current_Stage'] ?? raw['current_stage']),
    stageEnterDate: toDate(raw['Stage_Enter_Date'] ?? raw['stage_enter_date']),
    stageExitDate: toDate(raw['Stage_Exit_Date'] ?? raw['stage_exit_date']),
    status,
    cvSubmissionTimeHours: toNumber(raw['CV_Submission_Time']),
    recruiterResponseTimeHours: toNumber(raw['Recruiter_Response_Time']),

    source: toTrimmedString(raw['Source']),
    candidateType: getCandidateType(raw['Candidate Type (Internal/External)'] ?? raw['CandidateType']),
    diversityFlag: toYNBool(raw['Diversity_Flag']),
    isCompetitor: toYNBool(raw['Is_Competitor (Y/N)']),
    applicationStartTime: toDate(raw['Application_Start_Time']),
    applicationSubmitTime: toDate(raw['Application_Submit_Time']),
    applicationCompleted: toYNBool(raw['Application_Completed (Y/N)']),
    applicationEaseRating: toNumber(raw['Application_Ease_Rating']),
    candidateNps: toNumber(raw['Candidate_NPS']),
    skillMatchPercentage: toNumber(raw['Skill_Match_Percentage']),

    roleName: toTrimmedString(raw['Role_Name']),
    businessUnit: toTrimmedString(raw['Business_Unit']),
    location: toTrimmedString(raw['Location']),
    criticalSkillFlag: toYNBool(raw['Critical_Skill_Flag (Y/N)']),
    requisitionOpenDate: toDate(raw['Open_Date']),
    requisitionCloseDate: toDate(raw['Close_Date']),
    budgetedCost: toNumber(raw['Budgeted_Cost']),

    recruiterId: toTrimmedString(raw['Recruiter_ID']),
    matchingHoursTotal: toNumber(raw['Time_Spent_Matching (hrs)']),

    interviewDate: toDate(raw['Interview_Date']),
    feedbackDate: toDate(raw['Feedback_Date']),
    offerDate: toDate(raw['Offer_Date']),
    offerMade: toYNBool(raw['Offer_Made (Y/N)']),
    offerAccepted: toYNBool(raw['Offer_Accepted (Y/N)']),

    totalHiringCost: toNumber(raw['Total_Hiring_Cost']),
    jobViews: toNumber(raw['Job_Views']),
    jobApplicationsReceived: toNumber(raw['Applications_Received']),
  }
}

function normalizeFactRowsFromCockpitWorkbook(tables: RawTables): {
  rows: ApplicationFactRow[]
  diagnostics: DatasetDiagnostics
} {
  const requisitions = pickTable(tables, '1_Requisition')
  const candidates = pickTable(tables, '2_Candidate')
  const pipeline = pickTable(tables, '3_Application_Pipeline')
  const recruiterActivity = pickTable(tables, '4_Recruiter_Activity')
  const interviewOffer = pickTable(tables, '5_Interview_Offer')
  const hiringCost = pickTable(tables, '6_Hiring_Cost')
  const jobPosting = pickTable(tables, '7_Job_Posting_Analytics')

  if (pipeline.length > 200000) {
    throw new Error(
      `The uploaded workbook has ${pipeline.length.toLocaleString()} pipeline rows. Please split the file and retry to avoid browser memory issues.`,
    )
  }

  const sheetStats = Object.entries(tables).map(([name, rows]) => {
    const cols = new Set<string>()
    for (const r of rows.slice(0, 200)) for (const k of Object.keys(r)) cols.add(k)
    return { name, rowCount: rows.length, columns: [...cols].sort((a, b) => a.localeCompare(b)) }
  })

  const reqById = new Map<string, RawTableRow>()
  for (const r of requisitions) {
    const id = toTrimmedString(r['Requisition_ID'])
    if (id) reqById.set(id, r)
  }

  const candById = new Map<string, RawTableRow>()
  for (const c of candidates) {
    const id = toTrimmedString(c['Candidate_ID'])
    if (id) candById.set(id, c)
  }

  const costByReqId = new Map<string, RawTableRow>()
  for (const c of hiringCost) {
    const id = toTrimmedString(c['Requisition_ID'])
    if (id) costByReqId.set(id, c)
  }

  const postingByReqId = new Map<string, RawTableRow>()
  for (const p of jobPosting) {
    const id = toTrimmedString(p['Job_ID'])
    if (id) postingByReqId.set(id, p)
  }

  // Aggregate recruiter activity per candidate:
  // - sum matching hours
  // - pick recruiterId from most recent interaction date
  const recruiterAggByCandidateId = new Map<
    string,
    { recruiterId: string | null; matchingHoursTotal: number; lastInteractionDate: Date | null }
  >()
  for (const a of recruiterActivity) {
    const candidateId = toTrimmedString(a['Candidate_ID'])
    if (!candidateId) continue
    const recruiterId = toTrimmedString(a['Recruiter_ID'])
    const matching = toNumber(a['Time_Spent_Matching (hrs)']) ?? 0
    const d = toDate(a['Interaction_Date'])

    const prev = recruiterAggByCandidateId.get(candidateId) ?? {
      recruiterId: null,
      matchingHoursTotal: 0,
      lastInteractionDate: null,
    }
    prev.matchingHoursTotal += matching
    if (d && (!prev.lastInteractionDate || d > prev.lastInteractionDate)) {
      prev.lastInteractionDate = d
      prev.recruiterId = recruiterId
    }
    recruiterAggByCandidateId.set(candidateId, prev)
  }

  // Pick the latest interview record per candidate (by interview date, falling back to offer date).
  const interviewByCandidateId = new Map<string, RawTableRow>()
  const interviewSortDate = (r: RawTableRow): Date | null =>
    toDate(r['Interview_Date']) ?? toDate(r['Offer_Date']) ?? toDate(r['Feedback_Date'])
  for (const r of interviewOffer) {
    const candidateId = toTrimmedString(r['Candidate_ID'])
    if (!candidateId) continue
    const cur = interviewByCandidateId.get(candidateId)
    if (!cur) {
      interviewByCandidateId.set(candidateId, r)
      continue
    }
    const a = interviewSortDate(r)
    const b = interviewSortDate(cur)
    if (a && (!b || a > b)) interviewByCandidateId.set(candidateId, r)
  }

  const out: ApplicationFactRow[] = []
  let withCandidate = 0
  let withRequisition = 0
  let withCost = 0
  let withPosting = 0
  let withRecruiterActivity = 0
  let withInterviewOffer = 0
  let missingCandidateRefs = 0
  let missingRequisitionRefs = 0
  const missingCandidateIds = new Set<string>()
  const missingRequisitionIds = new Set<string>()
  const factCandidateIds = new Set<string>()
  const factRequisitionIds = new Set<string>()
  const joinedCandidateIds = new Set<string>()
  const joinedRequisitionIds = new Set<string>()
  const costJoinedRequisitionIds = new Set<string>()
  const postingJoinedRequisitionIds = new Set<string>()
  const recruiterActivityCandidateIds = new Set<string>()
  const interviewCandidateIds = new Set<string>()

  for (const p of pipeline) {
    const applicationId = toTrimmedString(p['Application_ID'])
    const candidateId = toTrimmedString(p['Candidate_ID'])
    const requisitionId = toTrimmedString(p['Requisition_ID'])

    const cand = candidateId ? candById.get(candidateId) : undefined
    const req = requisitionId ? reqById.get(requisitionId) : undefined
    const cost = requisitionId ? costByReqId.get(requisitionId) : undefined
    const posting = requisitionId ? postingByReqId.get(requisitionId) : undefined
    const recruiterAgg = candidateId ? recruiterAggByCandidateId.get(candidateId) : undefined
    const interview = candidateId ? interviewByCandidateId.get(candidateId) : undefined

    if (candidateId) factCandidateIds.add(candidateId)
    if (requisitionId) factRequisitionIds.add(requisitionId)

    if (cand) {
      withCandidate++
      if (candidateId) joinedCandidateIds.add(candidateId)
    }
    else if (candidateId) {
      missingCandidateRefs++
      if (missingCandidateIds.size < 12) missingCandidateIds.add(candidateId)
    }

    if (req) {
      withRequisition++
      if (requisitionId) joinedRequisitionIds.add(requisitionId)
    }
    else if (requisitionId) {
      missingRequisitionRefs++
      if (missingRequisitionIds.size < 12) missingRequisitionIds.add(requisitionId)
    }
    if (cost) {
      withCost++
      if (requisitionId) costJoinedRequisitionIds.add(requisitionId)
    }
    if (posting) {
      withPosting++
      if (requisitionId) postingJoinedRequisitionIds.add(requisitionId)
    }
    if (recruiterAgg) {
      withRecruiterActivity++
      if (candidateId) recruiterActivityCandidateIds.add(candidateId)
    }
    if (interview) {
      withInterviewOffer++
      if (candidateId) interviewCandidateIds.add(candidateId)
    }

    const statusRaw = toTrimmedString(p['Status (Active/Rejected/Hired)'])
    const status =
      statusRaw === 'Active' || statusRaw === 'Rejected' || statusRaw === 'Hired' ? statusRaw : null

    out.push({
      applicationId,
      candidateId,
      requisitionId,

      applicationDate: toDate(p['Application_Date']),
      currentStage: toTrimmedString(p['Current_Stage']),
      stageEnterDate: toDate(p['Stage_Enter_Date']),
      stageExitDate: toDate(p['Stage_Exit_Date']),
      status,
      cvSubmissionTimeHours: toNumber(p['CV_Submission_Time']),
      recruiterResponseTimeHours: toNumber(p['Recruiter_Response_Time']),

      source: toTrimmedString(cand?.['Source']),
      candidateType: getCandidateType(cand?.['Candidate Type (Internal/External)']),
      diversityFlag: toYNBool(cand?.['Diversity_Flag']),
      isCompetitor: toYNBool(cand?.['Is_Competitor (Y/N)']),
      applicationStartTime: toDate(cand?.['Application_Start_Time']),
      applicationSubmitTime: toDate(cand?.['Application_Submit_Time']),
      applicationCompleted: toYNBool(cand?.['Application_Completed (Y/N)']),
      applicationEaseRating: toNumber(cand?.['Application_Ease_Rating']),
      candidateNps: toNumber(cand?.['Candidate_NPS']),
      skillMatchPercentage: toNumber(cand?.['Skill_Match_Percentage']),

      roleName: toTrimmedString(req?.['Role_Name']),
      businessUnit: toTrimmedString(req?.['Business_Unit']),
      location: toTrimmedString(req?.['Location']),
      criticalSkillFlag: toYNBool(req?.['Critical_Skill_Flag (Y/N)']),
      requisitionOpenDate: toDate(req?.['Open_Date']),
      requisitionCloseDate: toDate(req?.['Close_Date']),
      budgetedCost: toNumber(req?.['Budgeted_Cost']),

      recruiterId: recruiterAgg?.recruiterId ?? null,
      matchingHoursTotal: recruiterAgg ? recruiterAgg.matchingHoursTotal : null,

      interviewDate: toDate(interview?.['Interview_Date']),
      feedbackDate: toDate(interview?.['Feedback_Date']),
      offerDate: toDate(interview?.['Offer_Date']),
      offerMade: toYNBool(interview?.['Offer_Made (Y/N)']),
      offerAccepted: toYNBool(interview?.['Offer_Accepted (Y/N)']),

      totalHiringCost: toNumber(cost?.['Total_Hiring_Cost']),

      jobViews: toNumber(posting?.['Job_Views']),
      jobApplicationsReceived: toNumber(posting?.['Applications_Received']),
    })
  }

  const warnings: string[] = []
  if (pipeline.length === 0) warnings.push('Sheet 3_Application_Pipeline has 0 rows.')
  if (withCandidate / Math.max(pipeline.length, 1) < 0.95)
    warnings.push(`Candidate join coverage is ${(withCandidate / Math.max(pipeline.length, 1) * 100).toFixed(1)}%.`)
  if (withRequisition / Math.max(pipeline.length, 1) < 0.95)
    warnings.push(`Requisition join coverage is ${(withRequisition / Math.max(pipeline.length, 1) * 100).toFixed(1)}%.`)

  const diagnostics: DatasetDiagnostics = {
    kind: 'xlsx',
    sheets: sheetStats.sort((a, b) => a.name.localeCompare(b.name)),
    joins: {
      factRows: pipeline.length,
      withCandidate,
      withRequisition,
      withCost,
      withPosting,
      withRecruiterActivity,
      withInterviewOffer,
      uniqueCandidateIdsInFact: factCandidateIds.size,
      uniqueRequisitionIdsInFact: factRequisitionIds.size,
      uniqueCandidatesWithCandidateJoin: joinedCandidateIds.size,
      uniqueRequisitionsWithRequisitionJoin: joinedRequisitionIds.size,
      uniqueRequisitionsWithCostJoin: costJoinedRequisitionIds.size,
      uniqueRequisitionsWithPostingJoin: postingJoinedRequisitionIds.size,
      uniqueCandidatesWithRecruiterActivity: recruiterActivityCandidateIds.size,
      uniqueCandidatesWithInterviewOffer: interviewCandidateIds.size,
      missingCandidateRefs,
      missingRequisitionRefs,
    },
    samples: {
      missingCandidateIds: [...missingCandidateIds],
      missingRequisitionIds: [...missingRequisitionIds],
    },
    warnings,
  }

  return { rows: out, diagnostics }
}
