import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import XLSX from 'xlsx'

class RNG {
  constructor(seed = 20260211) {
    this.state = seed >>> 0
  }

  next() {
    let x = this.state
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.state = x >>> 0
    return this.state / 0xffffffff
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    inputDir: 'generated/test-data',
    outputDir: 'generated/test-data-hackathon',
    seed: 20260211,
    requisitions: 3000,
    pipeline: 50000,
    recruiterActivity: 20000,
    interviewOffer: 12000,
    writeXlsx: true,
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--input' && args[i + 1]) opts.inputDir = args[++i]
    else if (a === '--output' && args[i + 1]) opts.outputDir = args[++i]
    else if (a === '--seed' && args[i + 1]) opts.seed = Number(args[++i]) || opts.seed
    else if (a === '--requisitions' && args[i + 1]) opts.requisitions = Math.max(1, Number(args[++i]) || opts.requisitions)
    else if (a === '--pipeline' && args[i + 1]) opts.pipeline = Math.max(1, Number(args[++i]) || opts.pipeline)
    else if (a === '--activity' && args[i + 1]) opts.recruiterActivity = Math.max(0, Number(args[++i]) || opts.recruiterActivity)
    else if (a === '--interview' && args[i + 1]) opts.interviewOffer = Math.max(0, Number(args[++i]) || opts.interviewOffer)
    else if (a === '--no-xlsx') opts.writeXlsx = false
  }

  return opts
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false })
  if (parsed.errors?.length) {
    throw new Error(`Failed parsing ${path.basename(filePath)}: ${parsed.errors[0].message}`)
  }
  return parsed.data
}

function sampleIndices(n, k, rng) {
  if (k >= n) return [...Array(n).keys()]
  const idx = [...Array(n).keys()]
  // Fisher-Yates partial shuffle
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng.next() * (n - i))
    const t = idx[i]
    idx[i] = idx[j]
    idx[j] = t
  }
  return idx.slice(0, k)
}

function sampleRows(rows, k, rng) {
  if (k >= rows.length) return rows.slice()
  const idx = sampleIndices(rows.length, k, rng)
  return idx.map((i) => rows[i])
}

function uniqueNonEmpty(values) {
  const s = new Set()
  for (const v of values) {
    const x = String(v ?? '').trim()
    if (x) s.add(x)
  }
  return s
}

function rowsToCsv(rows, headers) {
  const data = rows.map((r) => headers.map((h) => r[h] ?? ''))
  return Papa.unparse({ fields: headers, data })
}

function countBySetMembership(rows, key, set) {
  let n = 0
  for (const r of rows) {
    const v = String(r[key] ?? '').trim()
    if (v && set.has(v)) n++
  }
  return n
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeCsv(outPath, rows, headers) {
  fs.writeFileSync(outPath, rowsToCsv(rows, headers), 'utf8')
}

function toSheet(rows, headers) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  return ws
}

function main() {
  const opts = parseArgs()
  const rng = new RNG(opts.seed)
  const inputDir = path.resolve(opts.inputDir)
  const outputDir = path.resolve(opts.outputDir)

  ensureDir(outputDir)

  const files = {
    req: path.join(inputDir, '1_Requisition.csv'),
    cand: path.join(inputDir, '2_Candidate.csv'),
    pipe: path.join(inputDir, '3_Application_Pipeline.csv'),
    activity: path.join(inputDir, '4_Recruiter_Activity.csv'),
    interview: path.join(inputDir, '5_Interview_Offer.csv'),
    cost: path.join(inputDir, '6_Hiring_Cost.csv'),
    posting: path.join(inputDir, '7_Job_Posting_Analytics.csv'),
  }

  const reqRowsAll = parseCsv(files.req)
  const costRowsAll = parseCsv(files.cost)
  const postingRowsAll = parseCsv(files.posting)
  const pipeRowsAll = parseCsv(files.pipe)
  const candRowsAll = parseCsv(files.cand)
  const activityRowsAll = parseCsv(files.activity)
  const interviewRowsAll = parseCsv(files.interview)

  const reqHeaders = Object.keys(reqRowsAll[0] ?? {})
  const candHeaders = Object.keys(candRowsAll[0] ?? {})
  const pipeHeaders = Object.keys(pipeRowsAll[0] ?? {})
  const activityHeaders = Object.keys(activityRowsAll[0] ?? {})
  const interviewHeaders = Object.keys(interviewRowsAll[0] ?? {})
  const costHeaders = Object.keys(costRowsAll[0] ?? {})
  const postingHeaders = Object.keys(postingRowsAll[0] ?? {})

  const reqSeedRows = sampleRows(reqRowsAll, Math.min(opts.requisitions, reqRowsAll.length), rng)
  const reqSeedSet = uniqueNonEmpty(reqSeedRows.map((r) => r.Requisition_ID))

  let pipeCandidates = pipeRowsAll.filter((r) => reqSeedSet.has(String(r.Requisition_ID ?? '').trim()))
  pipeCandidates = sampleRows(pipeCandidates, Math.min(opts.pipeline, pipeCandidates.length), rng)

  const reqSetFinal = uniqueNonEmpty(pipeCandidates.map((r) => r.Requisition_ID))
  const candSetFinal = uniqueNonEmpty(pipeCandidates.map((r) => r.Candidate_ID))

  const reqRows = reqRowsAll.filter((r) => reqSetFinal.has(String(r.Requisition_ID ?? '').trim()))
  const costRows = costRowsAll.filter((r) => reqSetFinal.has(String(r.Requisition_ID ?? '').trim()))
  const postingRows = postingRowsAll.filter((r) => reqSetFinal.has(String(r.Job_ID ?? '').trim()))
  const candRows = candRowsAll.filter((r) => candSetFinal.has(String(r.Candidate_ID ?? '').trim()))

  let activityRows = activityRowsAll.filter((r) => candSetFinal.has(String(r.Candidate_ID ?? '').trim()))
  activityRows = sampleRows(activityRows, Math.min(opts.recruiterActivity, activityRows.length), rng)

  let interviewRows = interviewRowsAll.filter((r) => candSetFinal.has(String(r.Candidate_ID ?? '').trim()))
  interviewRows = sampleRows(interviewRows, Math.min(opts.interviewOffer, interviewRows.length), rng)

  writeCsv(path.join(outputDir, '1_Requisition.csv'), reqRows, reqHeaders)
  writeCsv(path.join(outputDir, '2_Candidate.csv'), candRows, candHeaders)
  writeCsv(path.join(outputDir, '3_Application_Pipeline.csv'), pipeCandidates, pipeHeaders)
  writeCsv(path.join(outputDir, '4_Recruiter_Activity.csv'), activityRows, activityHeaders)
  writeCsv(path.join(outputDir, '5_Interview_Offer.csv'), interviewRows, interviewHeaders)
  writeCsv(path.join(outputDir, '6_Hiring_Cost.csv'), costRows, costHeaders)
  writeCsv(path.join(outputDir, '7_Job_Posting_Analytics.csv'), postingRows, postingHeaders)

  if (opts.writeXlsx) {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, toSheet(reqRows, reqHeaders), '1_Requisition')
    XLSX.utils.book_append_sheet(wb, toSheet(candRows, candHeaders), '2_Candidate')
    XLSX.utils.book_append_sheet(wb, toSheet(pipeCandidates, pipeHeaders), '3_Application_Pipeline')
    XLSX.utils.book_append_sheet(wb, toSheet(activityRows, activityHeaders), '4_Recruiter_Activity')
    XLSX.utils.book_append_sheet(wb, toSheet(interviewRows, interviewHeaders), '5_Interview_Offer')
    XLSX.utils.book_append_sheet(wb, toSheet(costRows, costHeaders), '6_Hiring_Cost')
    XLSX.utils.book_append_sheet(wb, toSheet(postingRows, postingHeaders), '7_Job_Posting_Analytics')
    XLSX.writeFile(wb, path.join(outputDir, 'Data for Cockpit - hackathon.xlsx'))
  }

  const candidateSet = uniqueNonEmpty(candRows.map((r) => r.Candidate_ID))
  const reqSet = uniqueNonEmpty(reqRows.map((r) => r.Requisition_ID))
  const costSet = uniqueNonEmpty(costRows.map((r) => r.Requisition_ID))
  const postSet = uniqueNonEmpty(postingRows.map((r) => r.Job_ID))
  const activityCandidateSet = uniqueNonEmpty(activityRows.map((r) => r.Candidate_ID))
  const interviewCandidateSet = uniqueNonEmpty(interviewRows.map((r) => r.Candidate_ID))

  const qa = {
    createdAt: new Date().toISOString(),
    seed: opts.seed,
    targets: {
      requisitions: opts.requisitions,
      pipeline: opts.pipeline,
      recruiterActivity: opts.recruiterActivity,
      interviewOffer: opts.interviewOffer,
    },
    counts: {
      requisitions: reqRows.length,
      candidates: candRows.length,
      pipeline: pipeCandidates.length,
      recruiterActivity: activityRows.length,
      interviewOffer: interviewRows.length,
      hiringCost: costRows.length,
      posting: postingRows.length,
      totalRows:
        reqRows.length +
        candRows.length +
        pipeCandidates.length +
        activityRows.length +
        interviewRows.length +
        costRows.length +
        postingRows.length,
    },
    joins: {
      factRows: pipeCandidates.length,
      withCandidate: countBySetMembership(pipeCandidates, 'Candidate_ID', candidateSet),
      withRequisition: countBySetMembership(pipeCandidates, 'Requisition_ID', reqSet),
      withCost: countBySetMembership(pipeCandidates, 'Requisition_ID', costSet),
      withPosting: countBySetMembership(pipeCandidates, 'Requisition_ID', postSet),
      withRecruiterActivity: countBySetMembership(pipeCandidates, 'Candidate_ID', activityCandidateSet),
      withInterviewOffer: countBySetMembership(pipeCandidates, 'Candidate_ID', interviewCandidateSet),
    },
  }

  fs.writeFileSync(path.join(outputDir, 'qa_report.json'), JSON.stringify(qa, null, 2), 'utf8')
  console.log(JSON.stringify(qa, null, 2))
}

main()

