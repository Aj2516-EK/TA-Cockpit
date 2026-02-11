import type { KnowledgeBaseDoc } from '../knowledge-base'
import type { RetrievalMode } from './types'
import { keywordRetrieveDocs } from './keyword'
import { vectorRetrieveDocs } from './vector'

export async function retrieveDocs(
  docs: KnowledgeBaseDoc[],
  query: string,
  k: number,
): Promise<{ mode: RetrievalMode; docs: KnowledgeBaseDoc[] }> {
  try {
    const vector = await vectorRetrieveDocs(docs, query, k)
    if (vector && vector.length > 0) {
      return { mode: 'vector', docs: vector }
    }
  } catch (err) {
    // Fail-safe fallback. Keep app responsive even if embeddings are unavailable.
    console.warn('[rag] vector retrieval failed, falling back to keyword', err)
  }

  return { mode: 'keyword', docs: keywordRetrieveDocs(docs, query, k) }
}

