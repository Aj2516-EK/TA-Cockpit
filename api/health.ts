import { getChatModel, getEmbeddingModel, getEnv, getQdrantCollection, getQdrantUrl } from './env'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

  const body = {
    ok: true,
    hasOpenRouterKey: Boolean(getEnv('OPENROUTER_API_KEY')),
    chatModel: getChatModel(),
    embeddingModel: getEmbeddingModel(),
    hasQdrantUrl: Boolean(getQdrantUrl()),
    qdrantCollection: getQdrantCollection(),
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
