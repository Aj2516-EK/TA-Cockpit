import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KnowledgeBaseDoc } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadDocs(): KnowledgeBaseDoc[] {
  const docsPath = path.join(__dirname, 'documents.json')
  const raw = fs.readFileSync(docsPath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) throw new Error('knowledge-base/documents.json must be an array')

  return parsed.map((doc, i) => {
    const d = doc as Partial<KnowledgeBaseDoc>
    if (!d?.id || !d?.title || !d?.cluster || !d?.text) {
      throw new Error(`Invalid knowledge-base doc at index ${i}`)
    }
    return {
      id: d.id,
      title: d.title,
      cluster: d.cluster,
      text: d.text,
      tags: Array.isArray(d.tags) ? d.tags : [],
    } as KnowledgeBaseDoc
  })
}

export const KNOWLEDGE_BASE_DOCS: KnowledgeBaseDoc[] = loadDocs()
