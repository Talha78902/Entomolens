/**
 * Serverless API: /api/assistant
 * Conversational entomology assistant backed by Groq. The client supplies
 * relevant EntomoLens database context; this function never fabricates sources.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  callGroq,
  clampText,
  defaultGroqModel,
  requirePost,
  sendError,
  ValidationError,
} from './_lib/providers'

const SYSTEM_PROMPT = `You are EntomoLens AI, an entomology assistant for farmers, students, researchers and entomologists.

You answer questions about: insects, pest biology, taxonomy, life cycles, crop pests, beneficial insects, damage symptoms, IPM, and entomology education.

Rules you MUST follow:
- Prefer the database context the user provides. It is reliable; use it as your primary source.
- NEVER fabricate citations, DOIs, references or sources. If you rely on general knowledge, say so plainly ("based on general knowledge") and avoid inventing specific literature.
- NEVER invent pesticide rates, concentrations, mixing instructions or legal-use claims. Direct users to verified, labeled local guidance for chemicals.
- If a question is outside entomology, politely decline and steer back.
- Be concise, structured and clearly geared to the user's role.
- If there is insect context in the message, keep your answers focused on that species.`

const MAX_HISTORY = 16
const MAX_MESSAGE_CHARS = 4000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  try {
    const payload = (req.body ?? {}) as {
      messages?: Array<{ role?: unknown; content?: unknown }>
      context?: unknown
      insectName?: unknown
    }

    const history = (Array.isArray(payload.messages) ? payload.messages : [])
      .filter(
        (m): m is { role: 'user' | 'assistant'; content: string } =>
          (m?.role === 'user' || m?.role === 'assistant') &&
          typeof m?.content === 'string' &&
          m.content.trim().length > 0,
      )
      .map((m) => ({
        role: m.role,
        content: m.content.trim().slice(0, MAX_MESSAGE_CHARS),
      }))
      .slice(-MAX_HISTORY)

    if (history.length === 0) {
      throw new ValidationError('No message supplied.')
    }

    const context = clampText(payload.context, 8000)
    const insectName = clampText(payload.insectName, 160)

    const systemContext = [
      SYSTEM_PROMPT,
      insectName ? `This conversation is focused on: ${insectName}.` : null,
      context
        ? `Database context provided by the user (use this; it is from the EntomoLens verified database):\n${context}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    const model = defaultGroqModel()
    const { text } = await callGroq({
      model,
      messages: [
        { role: 'system', content: systemContext },
        ...history.map((message) => ({ role: message.role, content: message.content })),
      ],
      maxTokens: 900,
    })

    return res.status(200).json({ reply: text, modelName: model })
  } catch (error) {
    sendError(res, error)
  }
}
