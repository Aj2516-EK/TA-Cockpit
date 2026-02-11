import type { KnowledgeBaseDoc } from '../knowledge-base'

export function keywordRetrieveDocs(docs: KnowledgeBaseDoc[], query: string, k: number): KnowledgeBaseDoc[] {
  const q = query.toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)

  const scored = docs.map((d) => {
    const hay = [d.title, d.id, d.text, ...(d.tags ?? [])].join(' ').toLowerCase()
    let score = 0
    for (const t of terms) {
      if (hay.includes(t)) score += 1
    }
    if (q.includes(d.cluster)) score += 2
    return { d, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(12, k)))
    .map((x) => x.d)
}

