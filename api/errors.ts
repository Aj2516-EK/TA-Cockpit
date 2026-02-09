export function safeErrorMessage(err: unknown): string {
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

