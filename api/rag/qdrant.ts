import type { KnowledgeBaseCluster, KnowledgeBaseDoc } from '../knowledge-base/index.js'
import {
  getEmbeddingModel,
  getOpenRouterApiKey,
  getOpenRouterAppName,
  getOpenRouterSiteUrl,
  getQdrantApiKey,
  getQdrantCollection,
  getQdrantUrl,
} from '../env.js'

type QdrantPoint = {
  id?: string | number
  payload?: unknown
  score?: number
}

const KNOWN_CLUSTERS = new Set<KnowledgeBaseCluster>([
  'readiness',
  'momentum',
  'experience',
  'diversity',
  'economics',
  'global',
])

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function normalizeQdrantUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function parseDocFromPayload(payload: unknown): KnowledgeBaseDoc | null {
  const p = asRecord(payload)
  if (!p) return null

  const id = typeof p.docId === 'string' ? p.docId : null
  const title = typeof p.title === 'string' ? p.title : null
  const cluster = typeof p.cluster === 'string' ? p.cluster : null
  const text = typeof p.text === 'string' ? p.text : null
  const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === 'string') : []

  if (!id || !title || !cluster || !text) return null
  if (!KNOWN_CLUSTERS.has(cluster as KnowledgeBaseCluster)) return null

  return {
    id,
    title,
    cluster: cluster as KnowledgeBaseCluster,
    text,
    tags,
  }
}

async function embedQuery(query: string): Promise<Float32Array> {
  const apiKey = getOpenRouterApiKey()
  const model = getEmbeddingModel()
  const referer = getOpenRouterSiteUrl()
  const appName = getOpenRouterAppName()
  const timeoutMs = 8_000
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    let res: Response
    try {
      res = await fetchWithTimeout(
        'https://openrouter.ai/api/v1/embeddings',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(referer ? { 'HTTP-Referer': referer } : {}),
            ...(appName ? { 'X-Title': appName } : {}),
          },
          body: JSON.stringify({
            model,
            input: query,
            encoding_format: 'float',
            input_type: 'query',
          }),
        },
        timeoutMs,
      )
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      lastError = new Error(
        isAbort ? `Embedding API timeout after ${timeoutMs}ms` : `Embedding API request failed: ${String(err)}`,
      )
      if (attempt < 3) {
        await sleep(200 * 2 ** (attempt - 1))
        continue
      }
      throw lastError
    }

    if (!res.ok) {
      const text = await res.text()
      const retryable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 529
      lastError = new Error(`Embedding API error: ${res.status} ${text}`)
      if (retryable && attempt < 3) {
        await sleep(200 * 2 ** (attempt - 1))
        continue
      }
      throw lastError
    }

    const data = (await res.json()) as { data?: Array<{ index?: number; embedding?: number[] }> }
    const sorted = (data?.data ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const embedding = sorted[0]?.embedding
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Missing embedding vector in API response')
    }
    return Float32Array.from(embedding)
  }

  if (lastError) throw lastError
  throw new Error('Embedding request failed')
}

export async function qdrantRetrieveDocs(
  query: string,
  k: number,
): Promise<KnowledgeBaseDoc[] | null> {
  // Skip vector retrieval for tiny greetings.
  if ((query ?? '').trim().length < 8) {
    console.info('[rag:qdrant] skipped for short query')
    return null
  }

  const qdrantUrl = getQdrantUrl()
  if (!qdrantUrl) {
    console.info('[rag:qdrant] missing QDRANT_URL')
    return null
  }

  const apiKey = getQdrantApiKey()
  const collection = getQdrantCollection()
  const baseUrl = normalizeQdrantUrl(qdrantUrl)
  const queryVector = await embedQuery(query)
  const limit = Math.max(1, Math.min(12, k))

  const res = await fetchWithTimeout(
    `${baseUrl}/collections/${encodeURIComponent(collection)}/points/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        query: Array.from(queryVector),
        limit,
        with_payload: true,
        with_vector: false,
      }),
    },
    8_000,
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Qdrant query failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { result?: unknown }
  const result = json?.result
  const points: QdrantPoint[] = Array.isArray(result)
    ? (result as QdrantPoint[])
    : Array.isArray(asRecord(result)?.points)
      ? ((asRecord(result)?.points ?? []) as QdrantPoint[])
      : []

  if (points.length === 0) return []

  const docs: KnowledgeBaseDoc[] = []
  for (const p of points) {
    const parsed = parseDocFromPayload(p.payload)
    if (parsed) docs.push(parsed)
  }

  console.info(`[rag:qdrant] points=${points.length} parsedDocs=${docs.length} k=${limit}`)

  return docs
}
