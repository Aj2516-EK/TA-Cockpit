import type { KnowledgeBaseDoc } from '../knowledge-base/index.js'
import type { RetrievalMode } from './types.js'
import { keywordRetrieveDocs } from './keyword.js'
import { qdrantRetrieveDocs } from './qdrant.js'

export async function retrieveDocs(
  docs: KnowledgeBaseDoc[],
  query: string,
  k: number,
): Promise<{ mode: RetrievalMode; docs: KnowledgeBaseDoc[] }> {
  try {
    const qdrant = await qdrantRetrieveDocs(query, k)
    if (qdrant && qdrant.length > 0) {
      return { mode: 'qdrant', docs: qdrant }
    }
    if (qdrant && qdrant.length === 0) {
      console.info(`[rag] qdrant returned 0 docs for query="${query.slice(0, 80)}"; falling back to keyword`)
    } else {
      console.info(`[rag] qdrant unavailable for query="${query.slice(0, 80)}"; falling back to keyword`)
    }
  } catch (err) {
    console.warn('[rag] qdrant retrieval failed, falling back to keyword', err)
  }

  return { mode: 'keyword', docs: keywordRetrieveDocs(docs, query, k) }
}
