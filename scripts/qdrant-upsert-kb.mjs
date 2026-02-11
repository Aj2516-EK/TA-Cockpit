import fs from 'node:fs'
import path from 'node:path'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    collection: process.env.QDRANT_COLLECTION || 'ta_cockpit_kb',
    batchSize: 128,
    recreate: false,
    qdrantUrl: process.env.QDRANT_URL || '',
    qdrantApiKey: process.env.QDRANT_API_KEY || '',
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--collection' && args[i + 1]) opts.collection = args[++i]
    else if (a === '--batch' && args[i + 1]) opts.batchSize = Math.max(1, Number(args[++i]) || opts.batchSize)
    else if (a === '--recreate') opts.recreate = true
    else if (a === '--url' && args[i + 1]) opts.qdrantUrl = args[++i]
    else if (a === '--api-key' && args[i + 1]) opts.qdrantApiKey = args[++i]
  }
  return opts
}

function loadEnvLocalIfPresent() {
  const envPath = path.resolve('.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!key) continue
    if (process.env[key] != null) continue
    process.env[key] = line.slice(eq + 1).trim()
  }
}

function normalizeUrl(url) {
  return url.replace(/\/+$/, '')
}

function readKbDocs() {
  const file = path.resolve('api/knowledge-base/kb-docs.json')
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('api/knowledge-base/kb-docs.json must be a non-empty array')
  }
  return json
}

function readEmbeddings() {
  const metaPath = path.resolve('api/rag/embeddings.meta.json')
  const binPath = path.resolve('api/rag/embeddings.f32')
  if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) {
    throw new Error('Missing embeddings files. Run: npm run rag:embed')
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  const bin = fs.readFileSync(binPath)
  const matrix = new Float32Array(bin.buffer, bin.byteOffset, Math.floor(bin.byteLength / 4))
  if (!meta?.count || !meta?.dims || !Array.isArray(meta?.ids)) {
    throw new Error('Invalid api/rag/embeddings.meta.json')
  }
  if (matrix.length !== meta.count * meta.dims) {
    throw new Error(
      `Embeddings size mismatch: expected ${meta.count * meta.dims}, got ${matrix.length}`,
    )
  }
  return { meta, matrix }
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

async function qdrantRequest({ baseUrl, apiKey, method, pathName, body }) {
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'api-key': apiKey } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Qdrant ${method} ${pathName} failed: ${res.status} ${text}`)
  }
  return text ? JSON.parse(text) : {}
}

async function ensureCollection({ baseUrl, apiKey, collection, dims, recreate }) {
  if (recreate) {
    try {
      await qdrantRequest({
        baseUrl,
        apiKey,
        method: 'DELETE',
        pathName: `/collections/${encodeURIComponent(collection)}`,
      })
      process.stdout.write(`Deleted collection ${collection}\n`)
    } catch {
      // ignore missing collection
    }
  }

  await qdrantRequest({
    baseUrl,
    apiKey,
    method: 'PUT',
    pathName: `/collections/${encodeURIComponent(collection)}`,
    body: {
      vectors: {
        size: dims,
        distance: 'Cosine',
      },
    },
  })
}

function buildPoints({ docs, meta, matrix }) {
  const idToDoc = new Map(docs.map((d) => [d.id, d]))
  const points = []
  for (let i = 0; i < meta.ids.length; i++) {
    const docId = meta.ids[i]
    const doc = idToDoc.get(docId)
    if (!doc) continue
    const base = i * meta.dims
    const vector = Array.from(matrix.slice(base, base + meta.dims))
    points.push({
      id: i + 1,
      vector,
      payload: {
        docId: doc.id,
        title: doc.title,
        cluster: doc.cluster,
        text: doc.text,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
      },
    })
  }
  return points
}

async function main() {
  loadEnvLocalIfPresent()
  const opts = parseArgs()
  if (!opts.qdrantUrl) throw new Error('Missing QDRANT_URL')

  const baseUrl = normalizeUrl(opts.qdrantUrl)
  const docs = readKbDocs()
  const { meta, matrix } = readEmbeddings()
  const points = buildPoints({ docs, meta, matrix })
  if (points.length === 0) throw new Error('No points to upload. Check embeddings IDs vs kb-docs IDs.')

  await ensureCollection({
    baseUrl,
    apiKey: opts.qdrantApiKey,
    collection: opts.collection,
    dims: meta.dims,
    recreate: opts.recreate,
  })

  const batches = chunk(points, opts.batchSize)
  for (let i = 0; i < batches.length; i++) {
    await qdrantRequest({
      baseUrl,
      apiKey: opts.qdrantApiKey,
      method: 'PUT',
      pathName: `/collections/${encodeURIComponent(opts.collection)}/points?wait=true`,
      body: {
        points: batches[i],
      },
    })
    process.stdout.write(`Upserted batch ${i + 1}/${batches.length}\n`)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        qdrantUrl: baseUrl,
        collection: opts.collection,
        dims: meta.dims,
        docs: docs.length,
        points: points.length,
        batchSize: opts.batchSize,
        mode: 'kb-docs + embeddings vectors',
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

