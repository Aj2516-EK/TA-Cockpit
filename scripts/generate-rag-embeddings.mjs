import fs from 'node:fs'
import path from 'node:path'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    model: process.env.EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b',
    batchSize: 32,
    dryRun: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--model' && args[i + 1]) opts.model = args[++i]
    else if (a === '--batch' && args[i + 1]) opts.batchSize = Math.max(1, Number(args[++i]) || 32)
    else if (a === '--dry-run') opts.dryRun = true
  }
  return opts
}

async function embedBatch({ apiKey, model, inputs }) {
  const referer = process.env.OPENROUTER_SITE_URL
  const appName = process.env.OPENROUTER_APP_NAME
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
      input: inputs,
      encoding_format: 'float',
      input_type: 'document',
    }),
  })
  if (!res.ok) {
    throw new Error(`Embedding API failed: ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  const data = json?.data
  if (!Array.isArray(data)) throw new Error('Invalid embeddings response: missing data[]')
  const sorted = data.slice().sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
  const vectors = sorted.map((x) => x?.embedding).filter(Array.isArray)
  if (vectors.length !== inputs.length) {
    throw new Error(`Embedding response length mismatch. expected=${inputs.length}, actual=${vectors.length}`)
  }
  return vectors
}

async function main() {
  const { model, batchSize, dryRun } = parseArgs()
  const docsPath = path.resolve('api/knowledge-base/kb-docs.json')
  const outDir = path.resolve('api/rag')
  const metaPath = path.join(outDir, 'embeddings.meta.json')
  const binPath = path.join(outDir, 'embeddings.f32')

  const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'))
  if (!Array.isArray(docs) || docs.length === 0) throw new Error('kb-docs.json must contain docs[]')

  const ids = docs.map((d) => d.id)
  const inputs = docs.map((d) => [d.title, d.text, ...(d.tags ?? [])].join('\n'))

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          docs: docs.length,
          model,
          batchSize,
          output: { metaPath, binPath },
        },
        null,
        2,
      ),
    )
    return
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY')

  const vectors = []
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batchInputs = inputs.slice(i, i + batchSize)
    const batchVectors = await embedBatch({ apiKey, model, inputs: batchInputs })
    vectors.push(...batchVectors)
    process.stdout.write(`Embedded ${Math.min(i + batchSize, inputs.length)}/${inputs.length}\n`)
  }

  const dims = vectors[0]?.length ?? 0
  if (!dims) throw new Error('No embeddings returned')
  for (let i = 0; i < vectors.length; i++) {
    if (!Array.isArray(vectors[i]) || vectors[i].length !== dims) {
      throw new Error(`Inconsistent embedding dims at row ${i}`)
    }
  }

  const matrix = new Float32Array(vectors.length * dims)
  let offset = 0
  for (const vec of vectors) {
    for (let j = 0; j < vec.length; j++) matrix[offset++] = vec[j]
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(binPath, Buffer.from(matrix.buffer, matrix.byteOffset, matrix.byteLength))
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        model,
        dims,
        count: vectors.length,
        ids,
        generatedAt: new Date().toISOString(),
        source: 'api/knowledge-base/kb-docs.json',
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        docs: vectors.length,
        model,
        dims,
        wrote: { metaPath, binPath },
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
