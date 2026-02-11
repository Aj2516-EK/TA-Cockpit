import type { KnowledgeBaseDoc } from '../knowledge-base'
import type { RetrievalMode } from './types'
import { keywordRetrieveDocs } from './keyword'
import { qdrantRetrieveDocs } from './qdrant'

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
  } catch (err) {
    console.warn('[rag] qdrant retrieval failed, falling back to keyword', err)
  }

  return { mode: 'keyword', docs: keywordRetrieveDocs(docs, query, k) }
}
