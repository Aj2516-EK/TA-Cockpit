export type AssignmentStatus = 'assigned' | 'in_progress' | 'resolved'

export type MetricAssignment = {
  owner: string
  note: string
  targetDate: string
  assignedAt: string
  status: AssignmentStatus
  resolvedAt: string | null
}

export type AssignmentMap = Record<string, MetricAssignment>

const STORAGE_KEY = 'ta_metric_assignments'
const SCHEMA_VERSION = 2 // v1 had no status field

type StoragePayload = {
  _schemaVersion: number
  data: AssignmentMap
}

/** Load assignments from localStorage with v1→v2 migration */
export function loadAssignments(): AssignmentMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as StoragePayload | AssignmentMap

    // v2 format: { _schemaVersion, data }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      '_schemaVersion' in parsed &&
      (parsed as StoragePayload)._schemaVersion >= 2
    ) {
      return (parsed as StoragePayload).data
    }

    // v1 format: plain Record<string, {...}> without status
    const v1 = parsed as Record<string, Record<string, unknown>>
    const migrated: AssignmentMap = {}
    for (const [key, entry] of Object.entries(v1)) {
      if (!entry || typeof entry !== 'object') continue
      migrated[key] = {
        owner: String(entry.owner ?? ''),
        note: String(entry.note ?? ''),
        targetDate: String(entry.targetDate ?? ''),
        assignedAt: String(entry.assignedAt ?? ''),
        status: (entry.status as AssignmentStatus) ?? 'assigned',
        resolvedAt: (entry.resolvedAt as string) ?? null,
      }
    }

    // Persist migrated data
    saveAssignments(migrated)
    return migrated
  } catch {
    return {}
  }
}

/** Save assignments to localStorage */
export function saveAssignments(assignments: AssignmentMap): void {
  try {
    const payload: StoragePayload = {
      _schemaVersion: SCHEMA_VERSION,
      data: assignments,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore persistence failures.
  }
}

/** Transition status with validation */
export function transitionStatus(
  assignment: MetricAssignment,
  newStatus: AssignmentStatus,
): MetricAssignment {
  const { status } = assignment

  // assigned → in_progress
  if (status === 'assigned' && newStatus === 'in_progress') {
    return { ...assignment, status: 'in_progress' }
  }

  // in_progress → resolved
  if (status === 'in_progress' && newStatus === 'resolved') {
    return { ...assignment, status: 'resolved', resolvedAt: new Date().toISOString() }
  }

  // resolved → assigned (re-open)
  if (status === 'resolved' && newStatus === 'assigned') {
    return { ...assignment, status: 'assigned', resolvedAt: null }
  }

  // No-op for invalid transitions
  return assignment
}
