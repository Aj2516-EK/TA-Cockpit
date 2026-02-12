import { describe, it, expect } from 'vitest'
import { keywordRetrieveDocs } from './keyword'
import type { KnowledgeBaseDoc } from '../knowledge-base/types'

function doc(overrides: Partial<KnowledgeBaseDoc> = {}): KnowledgeBaseDoc {
  return {
    id: 'doc-1',
    title: 'Test Document',
    cluster: 'readiness',
    text: 'Sample text about talent acquisition.',
    tags: [],
    ...overrides,
  }
}

describe('keywordRetrieveDocs', () => {
  const docs: KnowledgeBaseDoc[] = [
    doc({ id: 'readiness-1', title: 'Skill Readiness', cluster: 'readiness', text: 'Measures skill match across pipeline', tags: ['skill', 'readiness'] }),
    doc({ id: 'momentum-1', title: 'Time to Next Step', cluster: 'momentum', text: 'Stage duration metrics', tags: ['time', 'momentum'] }),
    doc({ id: 'diversity-1', title: 'Diverse Attraction', cluster: 'diversity', text: 'Diversity flag percentage', tags: ['diversity'] }),
    doc({ id: 'economics-1', title: 'Cost Per Hire', cluster: 'economics', text: 'Total hiring cost divided by hires', tags: ['cost', 'economics'] }),
  ]

  it('returns documents matching query terms', () => {
    const results = keywordRetrieveDocs(docs, 'skill readiness', 3)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe('readiness-1')
  })

  it('boosts score when query includes cluster name', () => {
    const results = keywordRetrieveDocs(docs, 'diversity metrics', 4)
    expect(results[0].id).toBe('diversity-1')
  })

  it('respects k limit', () => {
    const results = keywordRetrieveDocs(docs, 'metrics', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('clamps k to minimum of 1', () => {
    const results = keywordRetrieveDocs(docs, 'skill', 0)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('clamps k to maximum of 12', () => {
    const results = keywordRetrieveDocs(docs, 'metrics', 100)
    expect(results.length).toBeLessThanOrEqual(12)
  })

  it('returns results sorted by score descending', () => {
    // "skill readiness" should match readiness-1 best (both terms + cluster)
    const results = keywordRetrieveDocs(docs, 'skill readiness pipeline', 4)
    // readiness-1 should be first since it matches "skill", "readiness", "pipeline" and cluster "readiness"
    expect(results[0].id).toBe('readiness-1')
  })

  it('handles empty query', () => {
    const results = keywordRetrieveDocs(docs, '', 3)
    // Empty query splits to no terms, so all scores are 0 (or just cluster bonus)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })
})
