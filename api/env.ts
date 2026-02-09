export function getEnv(name: string): string | undefined {
  // Vercel Edge runtime exposes env vars via process.env.
  // Keep reads centralized so swapping runtime/env access is painless.
  return process.env[name]
}

export function requiredEnv(name: string): string {
  const v = getEnv(name)
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export function getChatModel(): string {
  return getEnv('CHAT_MODEL') ?? getEnv('PRIMARY_MODEL') ?? 'openai/gpt-oss-120b:free'
}

export function getEmbeddingModel(): string {
  return getEnv('EMBEDDING_MODEL') ?? 'qwen/qwen3-embedding-8b'
}

