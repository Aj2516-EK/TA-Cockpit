function safeErrorMessage(err: unknown): string {
  // Avoid leaking secrets/stacktraces to the client while still being useful in a hackathon.
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function extractStatusCode(err: unknown): number | undefined {
  const root = asRecord(err)
  if (!root) return undefined

  const direct = root.statusCode
  if (typeof direct === 'number') return direct

  const data = asRecord(root.data)
  const error = data ? asRecord(data.error) : null
  const nested = error?.code
  return typeof nested === 'number' ? nested : undefined
}

function extractRaw(err: unknown): string | undefined {
  const root = asRecord(err)
  if (!root) return undefined
  const data = asRecord(root.data)
  const error = data ? asRecord(data.error) : null
  const metadata = error ? asRecord(error.metadata) : null
  const raw = metadata?.raw
  return typeof raw === 'string' ? raw : undefined
}

export function getPublicAiErrorMessage(err: unknown): string {
  const code = extractStatusCode(err)
  const msg = safeErrorMessage(err)
  const raw = extractRaw(err) ?? ''
  const hay = (msg + '\n' + raw).toLowerCase()

  if (code === 429 || hay.includes('rate-limit') || hay.includes('rate limited')) {
    return 'Rate limit hit upstream. Please retry in 30 to 60 seconds.'
  }

  if (hay.includes('no endpoints found matching your data policy') || hay.includes('free model publication')) {
    return 'This model is blocked by your OpenRouter privacy/data policy. Update privacy settings or switch CHAT_MODEL.'
  }

  if (code === 401 || code === 403 || hay.includes('unauthorized') || hay.includes('forbidden')) {
    return 'OpenRouter authentication failed. Check OPENROUTER_API_KEY.'
  }

  if (hay.includes('missing required env var')) {
    return 'Server misconfigured (missing env vars).'
  }

  return 'An error occurred.'
}
