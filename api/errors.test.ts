import { describe, it, expect } from 'vitest'
import { getPublicAiErrorMessage } from './errors'

describe('getPublicAiErrorMessage', () => {
  it('returns rate limit message for 429 status code', () => {
    const err = { statusCode: 429, message: 'Too many requests' }
    expect(getPublicAiErrorMessage(err)).toContain('Rate limit')
  })

  it('detects rate limit from message text', () => {
    const err = new Error('Request was rate-limited by upstream')
    expect(getPublicAiErrorMessage(err)).toContain('Rate limit')
  })

  it('returns timeout message for timeout errors', () => {
    const err = new Error('Connection timed out after 45s')
    expect(getPublicAiErrorMessage(err)).toContain('timed out')
  })

  it('returns timeout message for aborted errors', () => {
    const err = new Error('The operation was aborted')
    expect(getPublicAiErrorMessage(err)).toContain('timed out')
  })

  it('returns auth message for 401', () => {
    const err = { statusCode: 401, message: 'Invalid key' }
    expect(getPublicAiErrorMessage(err)).toContain('authentication failed')
  })

  it('returns auth message for 403', () => {
    const err = { statusCode: 403, message: 'forbidden' }
    expect(getPublicAiErrorMessage(err)).toContain('authentication failed')
  })

  it('returns policy message for data policy blocks', () => {
    const err = new Error('No endpoints found matching your data policy')
    expect(getPublicAiErrorMessage(err)).toContain('privacy/data policy')
  })

  it('returns env var message for missing env vars', () => {
    const err = new Error('Missing required env var: OPENROUTER_API_KEY')
    expect(getPublicAiErrorMessage(err)).toContain('missing env vars')
  })

  it('returns generic message for unknown errors', () => {
    const err = new Error('Something random happened')
    expect(getPublicAiErrorMessage(err)).toBe('An error occurred.')
  })

  it('handles null/undefined errors', () => {
    expect(getPublicAiErrorMessage(null)).toBe('An error occurred.')
    expect(getPublicAiErrorMessage(undefined)).toBe('An error occurred.')
  })

  it('extracts status from nested data.error.code structure', () => {
    const err = {
      message: 'Upstream error',
      data: { error: { code: 429 } },
    }
    expect(getPublicAiErrorMessage(err)).toContain('Rate limit')
  })

  it('extracts raw from nested metadata', () => {
    const err = {
      message: 'Error',
      data: {
        error: {
          code: 500,
          metadata: { raw: 'rate-limited by provider' },
        },
      },
    }
    expect(getPublicAiErrorMessage(err)).toContain('Rate limit')
  })
})
