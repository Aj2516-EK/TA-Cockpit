import XLSX from 'xlsx'

const wb = XLSX.readFile('generated/test-data/Data for Cockpit - curated.xlsx')
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length

const reqWs = wb.Sheets['1_Requisition']
const reqs = XLSX.utils.sheet_to_json(reqWs)
const reqMap = {}
for (const r of reqs) reqMap[r['Requisition_ID']] = r

const pipeWs = wb.Sheets['3_Application_Pipeline']
const pipe = XLSX.utils.sheet_to_json(pipeWs)

const candWs = wb.Sheets['2_Candidate']
const cands = XLSX.utils.sheet_to_json(candWs)
const candMap = {}
for (const c of cands) candMap[c['Candidate_ID']] = c

// Response time by BU
const rtByBU = {}
for (const r of pipe) {
  const req = reqMap[r['Requisition_ID']]
  if (!req) continue
  const bu = req['Business_Unit']
  const rt = r['Recruiter_Response_Time']
  if (!rtByBU[bu]) rtByBU[bu] = []
  rtByBU[bu].push(rt)
}
console.log('--- Recruiter Response Time by BU ---')
for (const [k, v] of Object.entries(rtByBU)) console.log(k + ': mean=' + avg(v).toFixed(1) + 'h  n=' + v.length)

// Cost by location
const costWs = wb.Sheets['6_Hiring_Cost']
const costs = XLSX.utils.sheet_to_json(costWs)
const costByLoc = {}
for (const c of costs) {
  const req = reqMap[c['Requisition_ID']]
  if (!req) continue
  const loc = req['Location']
  if (!costByLoc[loc]) costByLoc[loc] = []
  costByLoc[loc].push(c['Total_Hiring_Cost'])
}
console.log('\n--- Hiring Cost by Location ---')
for (const [k, v] of Object.entries(costByLoc)) console.log(k + ': mean=' + Math.round(avg(v)).toLocaleString() + ' AED  n=' + v.length)

// Diversity by location
const divByLoc = {}
for (const r of pipe) {
  const req = reqMap[r['Requisition_ID']]
  const cand = candMap[r['Candidate_ID']]
  if (!req || !cand) continue
  const loc = req['Location']
  if (!divByLoc[loc]) divByLoc[loc] = { y: 0, n: 0 }
  if (cand['Diversity_Flag'] === 'Y') divByLoc[loc].y++
  else divByLoc[loc].n++
}
console.log('\n--- Diversity by Location ---')
for (const [k, v] of Object.entries(divByLoc)) console.log(k + ': ' + (v.y / (v.y + v.n) * 100).toFixed(1) + '%  n=' + (v.y + v.n))

// Skill match by role (through pipeline)
const smByRole = {}
for (const r of pipe) {
  const req = reqMap[r['Requisition_ID']]
  const cand = candMap[r['Candidate_ID']]
  if (!req || !cand) continue
  const role = req['Role_Name']
  const sm = cand['Skill_Match_Percentage']
  if (!smByRole[role]) smByRole[role] = []
  smByRole[role].push(sm)
}
console.log('\n--- Skill Match by Role ---')
for (const [k, v] of Object.entries(smByRole)) console.log(k + ': mean=' + avg(v).toFixed(1) + '%  n=' + v.length)
