import type { KnowledgeBaseDoc } from './types.js'
import kbDocsRaw from './kb-docs.json' assert { type: 'json' }

function validateDocs(raw: unknown): KnowledgeBaseDoc[] {
  if (!Array.isArray(raw)) throw new Error('knowledge-base/kb-docs.json must be an array')

  return raw.map((doc, i) => {
    const d = doc as Partial<KnowledgeBaseDoc>
    if (!d?.id || !d?.title || !d?.cluster || !d?.text) {
      throw new Error(`Invalid knowledge-base doc at index ${i}`)
    }
    return {
      id: d.id,
      title: d.title,
      cluster: d.cluster,
      text: d.text,
      tags: Array.isArray(d.tags) ? d.tags : [],
    } as KnowledgeBaseDoc
  })
}

export const KNOWLEDGE_BASE_DOCS: KnowledgeBaseDoc[] = validateDocs(kbDocsRaw)
