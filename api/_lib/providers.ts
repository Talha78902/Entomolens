/**
 * Shared server-side helpers for EntomoLens AI endpoints.
 *
 * Files under `api/_lib/` are not routed by Vercel; they are shared modules.
 *
 * Design goals:
 *  - Never leak provider internals (URLs, keys, raw upstream bodies) to clients.
 *  - Retry transient upstream failures (429 / 5xx / network) with backoff.
 *  - Fall back across vision models, because a single model id can be
 *    permanently unavailable (e.g. "503 high demand").
 *  - Enforce request timeouts so a hung upstream cannot pin a serverless slot.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'

const DEFAULT_TIMEOUT_MS = 45_000
const MAX_ATTEMPTS = 3
const MAX_INPUT_BYTES = 8 * 1024 * 1024

export class ProviderError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(message: string, status = 502, retryable = false) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
    this.retryable = retryable
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fetch with a hard timeout and bounded retries for transient failures. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { attempts = MAX_ATTEMPTS, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
): Promise<Response> {
  let lastStatus = 0
  let lastBody = ''

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      if (response.ok) return response

      lastStatus = response.status
      lastBody = await response.text().catch(() => '')

      // 429 and 5xx are worth retrying; 4xx (bad key, bad request) is not.
      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt === attempts) break

      // Respect Retry-After when the provider supplies it.
      const retryAfter = Number(response.headers.get('retry-after'))
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15_000)
        : 600 * 2 ** (attempt - 1)
      await sleep(backoffMs)
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'
      lastStatus = aborted ? 504 : 0
      lastBody = aborted ? 'upstream timeout' : String(error)
      if (attempt === attempts) break
      await sleep(600 * 2 ** (attempt - 1))
    } finally {
      clearTimeout(timer)
    }
  }

  const safeDetail = sanitizeUpstream(lastBody)
  throw new ProviderError(
    `Upstream AI request failed (status ${lastStatus || 'network'}): ${safeDetail}`,
    lastStatus === 504 ? 504 : 502,
    false,
  )
}

/** Strip anything resembling a key/URL/HTML out of an upstream error body. */
function sanitizeUpstream(body: string): string {
  return body
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, '[redacted-key]')
    .replace(/sk-[0-9A-Za-z]{10,}/g, '[redacted-key]')
    .replace(/gsk_[0-9A-Za-z]{10,}/g, '[redacted-key]')
    .replace(/https?:\/\/\S+/g, '[redacted-url]')
    .replace(/<[^>]*>/g, '')
    .slice(0, 200)
    .trim()
}

export interface ImagePart {
  mime_type: string
  data: string
}

/**
 * Split a base64 data URL into the inline_image payload Gemini expects.
 *
 * The MIME type must permit '/', because every real image data URL carries a
 * subtype ("image/jpeg", "image/png", "image/webp"). An earlier version of this
 * pattern omitted '/', so it returned null for all of them and the image was
 * dropped from the request without any error: identification silently ran
 * text-only and came back "Unidentified Insect". Anything that fails to parse
 * here is a hard failure, not a reason to continue without the image.
 */
export function dataUrlParts(dataUrl: string): ImagePart | null {
  const match = dataUrl.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)?;base64,(.+)$/s)
  if (!match) return null
  return { mime_type: match[1] ?? 'image/jpeg', data: match[2] }
}

/** Ordered vision model candidates: configured model first, then known fallbacks. */
function geminiModelChain(): string[] {
  const configured = [
    process.env.GEMINI_VISION_MODEL?.trim(),
    process.env.GEMINI_MODEL?.trim(),
  ].filter((v): v is string => Boolean(v))
  // Verified against the live ListModels endpoint. gemini-1.5-flash and
  // gemini-2.0-flash were retired and now answer 404, so they are deliberately
  // absent: keeping them in the chain just burned a request per identification.
  // The "-latest" aliases are frequently saturated (503 high demand), which is
  // why more than one is listed and why the flash-lite alias is included.
  const fallbacks = ['gemini-flash-latest', 'gemini-flash-lite-latest']
  return [...new Set([...configured, ...fallbacks])]
}

/**
 * Call Gemini vision. Tries each model in the chain and retries transient
 * failures, so a single unavailable model id no longer breaks identification.
 */
export async function callGeminiVision(input: {
  systemPrompt: string
  prompt: string
  imageDataUrl: string
  maxOutputTokens?: number
}): Promise<{ text: string; model: string }> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new ProviderError('Vision provider is not configured.', 503)

  const parts = dataUrlParts(input.imageDataUrl)
  const chain = geminiModelChain()
  const failures: string[] = []

  for (const model of chain) {
    try {
      const response = await fetchWithRetry(
        `${GEMINI_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: input.systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [{ text: input.prompt }, ...(parts ? [{ inline_data: parts }] : [])],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: input.maxOutputTokens ?? 900,
            },
          }),
        },
        { attempts: 2 },
      )

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text =
        data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
      if (text.trim()) return { text, model }
      failures.push(`${model}: empty response`)
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }

  throw new ProviderError(
    `All vision models failed. ${sanitizeUpstream(failures.join('; '))}`,
    502,
  )
}

export interface GroqCall {
  model: string
  messages: Array<{ role: 'system' | 'user'; content: unknown }>
  maxTokens?: number
}

/** Call the Groq chat completions endpoint with retry and timeout. */
export async function callGroq(call: GroqCall): Promise<{ text: string; model: string }> {
  const key = process.env.GROQ_API_KEY?.trim()
  if (!key) throw new ProviderError('Text AI provider is not configured.', 503)

  const response = await fetchWithRetry(GROQ_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      temperature: 0.2,
      max_tokens: call.maxTokens ?? 900,
      model: call.model,
      messages: call.messages,
    }),
  })

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new ProviderError('Text AI provider returned an empty response.', 502)
  return { text, model: call.model }
}

export function defaultGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'
}

export function groqVisionModel(): string {
  return process.env.GROQ_VISION_MODEL?.trim() || ''
}

/** Parse a model reply that may be wrapped in a markdown fence. */
export function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : text).trim()
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

/** Enforce POST + a sane body size before doing any expensive work. */
export function requirePost(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  const declared = Number(req.headers['content-length'] ?? 0)
  if (Number.isFinite(declared) && declared > MAX_INPUT_BYTES) {
    res.status(413).json({ error: 'Request body too large' })
    return false
  }
  return true
}

/** Bound a free-text field so a huge string cannot be forwarded upstream. */
export function clampText(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/** Map any thrown value onto a safe client response. */
export function sendError(res: VercelResponse, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message })
    return
  }
  if (error instanceof ProviderError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  res.status(500).json({ error: 'Unexpected server error while contacting the AI provider.' })
}
