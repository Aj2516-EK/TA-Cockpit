export type EmbeddingsMeta = {
  model: string
  dims: number
  count: number
  ids: string[]
  generatedAt?: string
  source?: string
}

export type RetrievalMode = 'vector' | 'keyword'

