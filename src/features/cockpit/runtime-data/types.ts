export type RawTableRow = Record<string, unknown>

export type RawTables = Record<string, RawTableRow[]>

export type Dataset = {
  name: string
  loadedAt: Date
  rows: ApplicationFactRow[]
  columns: string[]
  diagnostics?: DatasetDiagnostics
  recruiterActivityRows?: RawTableRow[]
}

export type DatasetDiagnostics = {
  kind: 'xlsx' | 'csv'
  sheets?: Array<{
    name: string
    rowCount: number
    columns: string[]
  }>
  joins?: {
    // Fact-row coverage (counts rows in pipeline that found a join)
    factRows: number
    withCandidate: number
    withRequisition: number
    withCost: number
    withPosting: number
    withRecruiterActivity: number
    withInterviewOffer: number

    // Unique-key coverage (more intuitive for sparse side tables)
    uniqueCandidateIdsInFact?: number
    uniqueRequisitionIdsInFact?: number
    uniqueCandidatesWithCandidateJoin?: number
    uniqueRequisitionsWithRequisitionJoin?: number
    uniqueRequisitionsWithCostJoin?: number
    uniqueRequisitionsWithPostingJoin?: number
    uniqueCandidatesWithRecruiterActivity?: number
    uniqueCandidatesWithInterviewOffer?: number

    missingCandidateRefs?: number
    missingRequisitionRefs?: number
  }
  samples?: {
    missingCandidateIds?: string[]
    missingRequisitionIds?: string[]
  }
  warnings: string[]
}

export type Filters = {
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD

  businessUnit?: string[]
  location?: string[]
  roleName?: string[]
  criticalSkillFlag?: string[]

  source?: string[]
  candidateType?: string[]
  diversityFlag?: string[]

  currentStage?: string[]
  status?: string[]
  recruiterId?: string[]
}

export type FilterOptions = {
  businessUnit: string[]
  location: string[]
  roleName: string[]
  criticalSkillFlag: Array<'Y' | 'N'>
  source: string[]
  candidateType: Array<'Internal' | 'External'>
  diversityFlag: Array<'Y' | 'N'>
  currentStage: string[]
  status: Array<'Active' | 'Rejected' | 'Hired'>
  recruiterId: string[]
}

export type ApplicationFactRow = {
  // Keys
  applicationId: string | null
  candidateId: string | null
  requisitionId: string | null

  // Application / pipeline
  applicationDate: Date | null
  currentStage: string | null
  stageEnterDate: Date | null
  stageExitDate: Date | null
  status: 'Active' | 'Rejected' | 'Hired' | null
  cvSubmissionTimeHours: number | null
  recruiterResponseTimeHours: number | null

  // Candidate
  source: string | null
  candidateType: 'Internal' | 'External' | null
  diversityFlag: boolean | null
  isCompetitor: boolean | null
  applicationStartTime: Date | null
  applicationSubmitTime: Date | null
  applicationCompleted: boolean | null
  applicationEaseRating: number | null
  candidateNps: number | null
  skillMatchPercentage: number | null

  // Requisition
  roleName: string | null
  businessUnit: string | null
  location: string | null
  criticalSkillFlag: boolean | null
  requisitionOpenDate: Date | null
  requisitionCloseDate: Date | null
  budgetedCost: number | null

  // Recruiter activity (per candidate)
  recruiterId: string | null
  matchingHoursTotal: number | null

  // Interview / offer (per candidate)
  interviewDate: Date | null
  feedbackDate: Date | null
  offerDate: Date | null
  offerMade: boolean | null
  offerAccepted: boolean | null

  // Hiring cost (per req)
  totalHiringCost: number | null

  // Job posting analytics (per req)
  jobViews: number | null
  jobApplicationsReceived: number | null
}
