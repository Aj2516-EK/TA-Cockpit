import type { ApplicationFactRow, FilterOptions, Filters } from './types'

function uniqSorted(values: Array<string | null | undefined>): string[] {
  const s = new Set<string>()
  for (const v of values) {
    const t = (v ?? '').toString().trim()
    if (!t) continue
    s.add(t)
  }
  return [...s].sort((a, b) => a.localeCompare(b))
}

function asYNUnique(values: Array<boolean | null | undefined>): Array<'Y' | 'N'> {
  const s = new Set<'Y' | 'N'>()
  for (const v of values) {
    if (v === true) s.add('Y')
    if (v === false) s.add('N')
  }
  return [...s].sort()
}

function asTypeUnique(values: Array<string | null | undefined>): Array<'Internal' | 'External'> {
  const s = new Set<'Internal' | 'External'>()
  for (const v of values) {
    if (v === 'Internal' || v === 'External') s.add(v)
  }
  return [...s].sort()
}

function parseDateYmd(s: string): Date | null {
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function endOfDay(d: Date): Date {
  const out = new Date(d.getTime())
  out.setHours(23, 59, 59, 999)
  return out
}

function includesOrAll<T extends string>(selected: T[] | undefined, value: T | null): boolean {
  if (!selected || selected.length === 0) return true
  if (!value) return false
  return selected.includes(value)
}

export function deriveFilterOptions(rows: ApplicationFactRow[] | null): FilterOptions {
  if (!rows) {
    return {
      businessUnit: [],
      location: [],
      roleName: [],
      criticalSkillFlag: [],
      source: [],
      candidateType: [],
      diversityFlag: [],
      currentStage: [],
      status: [],
      recruiterId: [],
    }
  }

  return {
    businessUnit: uniqSorted(rows.map((r) => r.businessUnit)),
    location: uniqSorted(rows.map((r) => r.location)),
    roleName: uniqSorted(rows.map((r) => r.roleName)),
    criticalSkillFlag: asYNUnique(rows.map((r) => r.criticalSkillFlag)),
    source: uniqSorted(rows.map((r) => r.source)),
    candidateType: asTypeUnique(rows.map((r) => r.candidateType)),
    diversityFlag: asYNUnique(rows.map((r) => r.diversityFlag)),
    currentStage: uniqSorted(rows.map((r) => r.currentStage)),
    status: uniqSorted(rows.map((r) => r.status)).filter(
      (s): s is 'Active' | 'Rejected' | 'Hired' => s === 'Active' || s === 'Rejected' || s === 'Hired',
    ),
    recruiterId: uniqSorted(rows.map((r) => r.recruiterId)),
  }
}

export function applyFilters(rows: ApplicationFactRow[], filters: Filters): ApplicationFactRow[] {
  const from = filters.dateFrom ? parseDateYmd(filters.dateFrom) : null
  const to = filters.dateTo ? endOfDay(parseDateYmd(filters.dateTo) ?? new Date('Invalid')) : null

  return rows.filter((r) => {
    if (from || to) {
      const d = r.applicationDate
      if (!d) return false
      if (from && d < from) return false
      if (to && d > to) return false
    }

    if (!includesOrAll(filters.businessUnit, r.businessUnit)) return false
    if (!includesOrAll(filters.location, r.location)) return false
    if (!includesOrAll(filters.roleName, r.roleName)) return false

    if (filters.criticalSkillFlag && filters.criticalSkillFlag.length) {
      const v = r.criticalSkillFlag == null ? null : r.criticalSkillFlag ? 'Y' : 'N'
      if (!v) return false
      if (!filters.criticalSkillFlag.includes(v)) return false
    }

    if (!includesOrAll(filters.source, r.source)) return false
    if (filters.candidateType && filters.candidateType.length) {
      if (!r.candidateType) return false
      if (!filters.candidateType.includes(r.candidateType)) return false
    }
    if (filters.diversityFlag && filters.diversityFlag.length) {
      const v = r.diversityFlag == null ? null : r.diversityFlag ? 'Y' : 'N'
      if (!v) return false
      if (!filters.diversityFlag.includes(v)) return false
    }

    if (!includesOrAll(filters.currentStage, r.currentStage)) return false
    if (filters.status && filters.status.length) {
      if (!r.status) return false
      if (!filters.status.includes(r.status)) return false
    }
    if (!includesOrAll(filters.recruiterId, r.recruiterId)) return false

    return true
  })
}

export function resetFilters(): Filters {
  return {}
}

