import fs from 'node:fs'
import path from 'node:path'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    model: process.env.CHAT_MODEL || 'openai/gpt-4.1',
    fallbackModel: 'openai/gpt-4o-mini',
    timeoutMs: 20_000,
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--model' && args[i + 1]) opts.model = args[++i]
    else if (a === '--fallback' && args[i + 1]) opts.fallbackModel = args[++i]
    else if (a === '--timeout-ms' && args[i + 1]) opts.timeoutMs = Math.max(1000, Number(args[++i]) || opts.timeoutMs)
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
    const value = line.slice(eq + 1).trim()
    process.env[key] = value
  }
}

async function fetchJson(url, init, timeoutMs) {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs)
  const startedAt = Date.now()
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const text = await res.text()
    const elapsedMs = Date.now() - startedAt
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return {
      ok: res.ok,
      status: res.status,
      elapsedMs,
      text,
      json,
    }
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, elapsedMs, error: message, text: '', json: null }
  } finally {
    clearTimeout(timeout)
  }
}

function redactKey(key) {
  if (!key) return '<missing>'
  if (key.length < 10) return '<set>'
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

async function runChatProbe({ apiKey, model, timeoutMs }) {
  return fetchJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
        temperature: 0,
        max_tokens: 24,
        stream: false,
      }),
    },
    timeoutMs,
  )
}

async function main() {
  loadEnvLocalIfPresent()
  const { model, fallbackModel, timeoutMs } = parseArgs()
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY (set env var or .env.local)')

  const summary = {
    startedAt: new Date().toISOString(),
    key: redactKey(apiKey),
    configuredModel: model,
    fallbackModel,
    timeoutMs,
    checks: {},
  }

  const modelsRes = await fetchJson(
    'https://openrouter.ai/api/v1/models',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    timeoutMs,
  )
  summary.checks.models = {
    ok: modelsRes.ok,
    status: modelsRes.status,
    elapsedMs: modelsRes.elapsedMs,
    error: modelsRes.error || null,
  }

  const primary = await runChatProbe({ apiKey, model, timeoutMs })
  summary.checks.primaryChat = {
    model,
    ok: primary.ok,
    status: primary.status,
    elapsedMs: primary.elapsedMs,
    error: primary.error || null,
    preview: (primary.text || '').slice(0, 260),
  }

  const fallback = await runChatProbe({ apiKey, model: fallbackModel, timeoutMs })
  summary.checks.fallbackChat = {
    model: fallbackModel,
    ok: fallback.ok,
    status: fallback.status,
    elapsedMs: fallback.elapsedMs,
    error: fallback.error || null,
    preview: (fallback.text || '').slice(0, 260),
  }

  const primaryOk = primary.ok
  const fallbackOk = fallback.ok

  summary.result = primaryOk
    ? 'ok_primary'
    : fallbackOk
      ? 'primary_model_issue_or_queue'
      : 'provider_or_key_issue'

  console.log(JSON.stringify(summary, null, 2))

  if (!primaryOk && !fallbackOk) process.exit(2)
  if (!primaryOk && fallbackOk) process.exit(3)
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  )
  process.exit(1)
})

