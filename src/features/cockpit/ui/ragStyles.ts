import type { Rag } from '../model'

export function ragCardClass(rag: Rag) {
  switch (rag) {
    case 'red':
      return 'bg-[linear-gradient(135deg,rgba(244,63,94,0.20),rgba(2,6,23,0.0))] border-rose-500/30 shadow-[0_16px_50px_rgba(244,63,94,0.10)]'
    case 'amber':
      return 'bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(2,6,23,0.0))] border-amber-500/30 shadow-[0_16px_50px_rgba(245,158,11,0.10)]'
    case 'green':
      return 'bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(2,6,23,0.0))] border-emerald-500/30 shadow-[0_16px_50px_rgba(16,185,129,0.10)]'
  }
}

export function ragPillClass(rag: Rag) {
  switch (rag) {
    case 'red':
      return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
    case 'amber':
      return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
    case 'green':
      return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
  }
}

