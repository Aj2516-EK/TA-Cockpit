import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseUploadToDataset } from './parse'

/**
 * Helper to create a minimal multi-sheet XLSX file with the new fields.
 */
function createTestWorkbook() {
  const wb = XLSX.utils.book_new()

  // 1_Requisition
  const reqData = [
    {
      Requisition_ID: 'REQ-001',
      Role_Name: 'Engineer',
      Business_Unit: 'Tech',
      Location: 'Dubai',
      'Critical_Skill_Flag (Y/N)': 'Y',
      Open_Date: '2026-01-01',
      Close_Date: '2026-02-01',
      Budgeted_Cost: 50000,
      Skills_Required: 'TypeScript, React',
      Hiring_Manager_ID: 'HM-42',
    },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqData), '1_Requisition')

  // 2_Candidate
  const candData = [
    {
      Candidate_ID: 'CAND-001',
      Source: 'LinkedIn',
      'Candidate Type (Internal/External)': 'External',
      Diversity_Flag: 'Female',
      'Is_Competitor (Y/N)': 'N',
      Application_Start_Time: '2026-01-05T09:00:00',
      Application_Submit_Time: '2026-01-05T09:10:00',
      'Application_Completed (Y/N)': 'Y',
      Application_Ease_Rating: 4.5,
      Candidate_NPS: 8,
      Skill_Match_Percentage: 85,
      Primary_Skills: 'React, Node.js',
      Skillset_Category: 'Frontend',
      Secondary_Skills: 'Python',
      Skill_Proficiency_Level: 'Advanced',
      'Transferrable skillset': 'Full Stack',
      'Transferable_Skill_Match_%': 72,
      Future_Readiness_Score: 88,
      Availability_Window: 'Immediate',
      Bench_Strength_Tag: 'Hot',
      Mobility_Preference: 'Local',
      'Upskilling_Interest (Y/N)': 'Y',
    },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(candData), '2_Candidate')

  // 3_Application_Pipeline
  const pipelineData = [
    {
      Application_ID: 'APP-001',
      Candidate_ID: 'CAND-001',
      Requisition_ID: 'REQ-001',
      Application_Date: '2026-01-05',
      Current_Stage: 'Interview',
      Stage_Enter_Date: '2026-01-10',
      Stage_Exit_Date: '2026-01-12',
      'Status (Active/Rejected/Hired)': 'Active',
      CV_Submission_Time: 2.5,
      Recruiter_Response_Time: 18,
    },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pipelineData), '3_Application_Pipeline')

  // 4_Recruiter_Activity (empty)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '4_Recruiter_Activity')

  // 5_Interview_Offer (empty)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '5_Interview_Offer')

  // 6_Hiring_Cost
  const costData = [
    {
      Requisition_ID: 'REQ-001',
      Total_Hiring_Cost: 15000,
      Advertising_Cost: 3000,
      Agency_Fee: 5000,
      Technology_Cost: 2000,
      Recruiter_Cost: 5000,
    },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costData), '6_Hiring_Cost')

  // 7_Job_Posting_Analytics (empty)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '7_Job_Posting_Analytics')

  return wb
}

function workbookToFile(wb: XLSX.WorkBook, name = 'test.xlsx'): File {
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buf], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('parseUploadToDataset — new fields', () => {
  it('populates all 18 new fields from candidate/req/cost joins', async () => {
    const wb = createTestWorkbook()
    const file = workbookToFile(wb)
    const dataset = await parseUploadToDataset(file)

    expect(dataset.rows).toHaveLength(1)
    const row = dataset.rows[0]

    // Candidate enrichment fields
    expect(row.primarySkills).toBe('React, Node.js')
    expect(row.skillsetCategory).toBe('Frontend')
    expect(row.secondarySkills).toBe('Python')
    expect(row.skillProficiencyLevel).toBe('Advanced')
    expect(row.transferrableSkillset).toBe('Full Stack')
    expect(row.transferableSkillMatchPct).toBe(72)
    expect(row.futureReadinessScore).toBe(88)
    expect(row.availabilityWindow).toBe('Immediate')
    expect(row.benchStrengthTag).toBe('Hot')
    expect(row.mobilityPreference).toBe('Local')
    expect(row.upskillingInterest).toBe(true)

    // Requisition enrichment
    expect(row.skillsRequired).toBe('TypeScript, React')
    expect(row.hiringManagerId).toBe('HM-42')

    // Cost breakdown
    expect(row.advertisingCost).toBe(3000)
    expect(row.agencyFee).toBe(5000)
    expect(row.technologyCost).toBe(2000)
    expect(row.recruiterCost).toBe(5000)
    expect(row.totalHiringCost).toBe(15000)
  })

  it('produces null for missing fields (not undefined or NaN)', async () => {
    const wb = XLSX.utils.book_new()

    // Minimal pipeline with no candidate/req/cost joins
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '1_Requisition')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '2_Candidate')
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Application_ID: 'APP-X',
          Candidate_ID: 'CAND-X',
          Requisition_ID: 'REQ-X',
          'Status (Active/Rejected/Hired)': 'Active',
        },
      ]),
      '3_Application_Pipeline',
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '4_Recruiter_Activity')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '5_Interview_Offer')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '6_Hiring_Cost')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), '7_Job_Posting_Analytics')

    const file = workbookToFile(wb)
    const dataset = await parseUploadToDataset(file)
    const row = dataset.rows[0]

    // All new fields should be null (not undefined)
    expect(row.primarySkills).toBeNull()
    expect(row.skillsetCategory).toBeNull()
    expect(row.secondarySkills).toBeNull()
    expect(row.skillProficiencyLevel).toBeNull()
    expect(row.transferrableSkillset).toBeNull()
    expect(row.transferableSkillMatchPct).toBeNull()
    expect(row.futureReadinessScore).toBeNull()
    expect(row.availabilityWindow).toBeNull()
    expect(row.benchStrengthTag).toBeNull()
    expect(row.mobilityPreference).toBeNull()
    expect(row.upskillingInterest).toBeNull()
    expect(row.skillsRequired).toBeNull()
    expect(row.hiringManagerId).toBeNull()
    expect(row.advertisingCost).toBeNull()
    expect(row.agencyFee).toBeNull()
    expect(row.technologyCost).toBeNull()
    expect(row.recruiterCost).toBeNull()
  })
})
