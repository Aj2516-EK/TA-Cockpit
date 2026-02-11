import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KnowledgeBaseDoc } from '../knowledge-base'
import { getEmbeddingModel, getOpenRouterApiKey, getOpenRouterAppName, getOpenRouterSiteUrl } from '../env'
import type { EmbeddingsMeta } from './types'

type VectorIndex = {
  meta: EmbeddingsMeta
  matrix: Float32Array
  norms: Float32Array
}

let cachedIndex: VectorIndex | null = null
let attemptedLoad = false

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function buildNorms(matrix: Float32Array, dims: number, count: number): Float32Array {
  const norms = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    let sum = 0
    const base = i * dims
    for (let j = 0; j < dims; j++) {
      const v = matrix[base + j]
      sum += v * v
    }
    norms[i] = Math.sqrt(sum) || 1e-12
  }
  return norms
}

function loadVectorIndex(): VectorIndex | null {
  if (attemptedLoad) return cachedIndex
  attemptedLoad = true

  const metaPath = path.join(__dirname, 'embeddings.meta.json')
  const binPath = path.join(__dirname, 'embeddings.f32')
  if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) return null

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as EmbeddingsMeta
  if (!meta || !Number.isFinite(meta.dims) || !Number.isFinite(meta.count) || !Array.isArray(meta.ids)) return null
  if (meta.count <= 0 || meta.dims <= 0) return null

  const bin = fs.readFileSync(binPath)
  const floatCount = Math.floor(bin.byteLength / 4)
  const matrix = new Float32Array(bin.buffer, bin.byteOffset, floatCount)
  if (matrix.length !== meta.count * meta.dims) {
    throw new Error(
      `Embeddings size mismatch. expected=${meta.count * meta.dims}, actual=${matrix.length}`,
    )
  }
  const norms = buildNorms(matrix, meta.dims, meta.count)
  cachedIndex = { meta, matrix, norms }
  return cachedIndex
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function embedQuery(query: string): Promise<Float32Array> {
  const apiKey = getOpenRouterApiKey()
  const model = getEmbeddingModel()
  const referer = getOpenRouterSiteUrl()
  const appName = getOpenRouterAppName()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
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
    })

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

function cosineScores(index: VectorIndex, query: Float32Array): Array<{ idx: number; score: number }> {
  const { meta, matrix, norms } = index
  if (query.length !== meta.dims) {
    throw new Error(`Embedding dims mismatch. query=${query.length}, index=${meta.dims}`)
  }

  let qNormSq = 0
  for (let i = 0; i < query.length; i++) qNormSq += query[i] * query[i]
  const qNorm = Math.sqrt(qNormSq) || 1e-12

  const out: Array<{ idx: number; score: number }> = []
  for (let i = 0; i < meta.count; i++) {
    const base = i * meta.dims
    let dot = 0
    for (let j = 0; j < meta.dims; j++) {
      dot += matrix[base + j] * query[j]
    }
    out.push({ idx: i, score: dot / (norms[i] * qNorm) })
  }
  return out
}

export async function vectorRetrieveDocs(
  docs: KnowledgeBaseDoc[],
  query: string,
  k: number,
): Promise<KnowledgeBaseDoc[] | null> {
  const index = loadVectorIndex()
  if (!index) return null

  const idToDoc = new Map(docs.map((d) => [d.id, d]))
  const queryEmbedding = await embedQuery(query)
  const scored = cosineScores(index, queryEmbedding)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(12, k)))

  const out: KnowledgeBaseDoc[] = []
  for (const s of scored) {
    const id = index.meta.ids[s.idx]
    const doc = idToDoc.get(id)
    if (doc) out.push(doc)
  }
  return out
}
