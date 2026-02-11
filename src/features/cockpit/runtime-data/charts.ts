import type { ApplicationFactRow } from './types'

export type StageDistributionPoint = {
  stage: string
  applications: number
}

export type WeeklyTrendPoint = {
  weekStart: string // YYYY-MM-DD
  applications: number
  hires: number
}

function ymd(d: Date): string {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function startOfIsoWeek(d: Date): Date {
  // Monday as the first day of week.
  const out = new Date(d.getTime())
  out.setHours(0, 0, 0, 0)
  const day = out.getDay() // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7 // Mon=0, Sun=6
  out.setDate(out.getDate() - diff)
  return out
}

function stageSortKey(stage: string): number {
  const s = stage.trim().toLowerCase()
  const order = [
    'applied',
    'screen',
    'shortlist',
    'interview',
    'offer',
    'hired',
    'rejected',
  ]
  for (let i = 0; i < order.length; i++) {
    if (s.includes(order[i])) return i
  }
  return 999
}

export function computeStageDistribution(rows: ApplicationFactRow[]) {
  const byStage = new Map<string, Set<string>>()
  const fallback = new Set<number>()

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const stage = (r.currentStage ?? '').trim() || 'Unknown'
    const appKey = r.applicationId ?? null
    if (appKey) {
      let s = byStage.get(stage)
      if (!s) byStage.set(stage, (s = new Set()))
      s.add(appKey)
    } else {
      fallback.add(i)
    }
  }

  const points: StageDistributionPoint[] = []
  for (const [stage, set] of byStage.entries()) {
    points.push({ stage, applications: set.size })
  }

  points.sort((a, b) => {
    const ak = stageSortKey(a.stage)
    const bk = stageSortKey(b.stage)
    if (ak !== bk) return ak - bk
    return b.applications - a.applications
  })

  const totalApplications = new Set(rows.map((r) => r.applicationId).filter((v): v is string => !!v)).size

  return {
    points,
    totalApplications: totalApplications || rows.length,
    missingApplicationIdRows: fallback.size,
  }
}

export function computeWeeklyTrend(rows: ApplicationFactRow[]) {
  const byWeekApps = new Map<string, Set<string>>()
  const byWeekHires = new Map<string, Set<string>>()
  let missingDates = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.applicationDate) {
      missingDates++
      continue
    }
    const wk = ymd(startOfIsoWeek(r.applicationDate))
    const appId = r.applicationId ?? `row:${i}`

    let a = byWeekApps.get(wk)
    if (!a) byWeekApps.set(wk, (a = new Set()))
    a.add(appId)

    if (r.status === 'Hired') {
      let h = byWeekHires.get(wk)
      if (!h) byWeekHires.set(wk, (h = new Set()))
      h.add(appId)
    }
  }

  const weeks = [...byWeekApps.keys()].sort((a, b) => a.localeCompare(b))
  const points: WeeklyTrendPoint[] = weeks.map((w) => ({
    weekStart: w,
    applications: byWeekApps.get(w)?.size ?? 0,
    hires: byWeekHires.get(w)?.size ?? 0,
  }))

  return { points, missingDates }
}

