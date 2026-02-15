import type { Rag } from '../model'

export function ragCardClass(rag: Rag) {
  switch (rag) {
    case 'red':
      return 'bg-rose-50 border-rose-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)] dark:bg-[linear-gradient(135deg,rgba(244,63,94,0.20),rgba(2,6,23,0.0))] dark:border-rose-500/30 dark:shadow-[0_16px_50px_rgba(244,63,94,0.10)]'
    case 'amber':
      return 'bg-amber-50 border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.08)] dark:bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(2,6,23,0.0))] dark:border-amber-500/30 dark:shadow-[0_16px_50px_rgba(245,158,11,0.10)]'
    case 'green':
      return 'bg-emerald-50 border-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.08)] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(2,6,23,0.0))] dark:border-emerald-500/30 dark:shadow-[0_16px_50px_rgba(16,185,129,0.10)]'
  }
}

export function ragPillClass(rag: Rag) {
  switch (rag) {
    case 'red':
      return 'bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30'
    case 'amber':
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30'
    case 'green':
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30'
  }
}
