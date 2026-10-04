/**
 * Serverless API: /api/damage
 *
 * "Damage Detective" IPM diagnosis. Like /api/identify it degrades to a
 * text-only hypothesis when every vision model is unavailable, instead of
 * throwing an unhandled error and returning a 500 with a raw upstream body.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  callGeminiVision,
  callGroq,
  clampText,
  defaultGroqModel,
  extractJson,
  groqVisionModel,
  requirePost,
  sendError,
  ValidationError,
} from './_lib/providers'

const SYSTEM_PROMPT = `You are EntomoLens "Damage Detective", an agricultural IPM diagnostic assistant.

Task: given plant damage images/descriptions and answers to questions, diagnose the most likely damage causes.

Rules:
- Consider chewing, piercing-sucking, mining, boring, skeletonization, webbing, curling, wilting, fruit-damage and disease/nutrient disorders.
- Only propose causes supported by the evidence; say so explicitly if inconclusive.
- Never invent pesticide rates, concentrations, mixing instructions or legal-use claims.
- Prefer IPM-first advice: monitoring, cultural, mechanical, physical, biological before chemical.

Respond ONLY with a single valid JSON object, no markdown:
{
  "observedSymptoms": ["..."],
  "possibleGroups": ["Chewing insect", "Piercing-sucking insect"],
  "candidates": [
    { "scientificName": "...", "commonName": "...", "reasoning": "..." }
  ],
  "additionalObservations": ["What to look for next"],
  "ipmAdvice": ["IPM-first suggestions"],
  "disclaimer": "AI-assisted diagnosis. Pest identification should be confirmed before chemical use."
}`

interface DamageBody {
  imageDataUrl?: string | null
  crop?: string
  damageWhere?: string
  noticedWhen?: string
  insectsVisible?: string
  webbing?: string
  honeydew?: string
  isIncreasing?: string
}

const QUESTIONS: Array<[keyof DamageBody, string]> = [
  ['crop', 'Which crop?'],
  ['damageWhere', 'Where is the damage?'],
  ['noticedWhen', 'When did you notice it?'],
  ['insectsVisible', 'Are insects visible?'],
  ['webbing', 'Is there webbing?'],
  ['honeydew', 'Is there honeydew?'],
  ['isIncreasing', 'Is the damage increasing?'],
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  try {
    const body = (req.body ?? {}) as DamageBody
    const imageDataUrl = clampText(body.imageDataUrl, 4 * 1024 * 1024)
    const hasImage = Boolean(imageDataUrl)

    const answers = QUESTIONS.map(([key, label]) => {
      const value = clampText(body[key], 200)
      return value ? `${label} ${value}` : null
    }).filter((v): v is string => Boolean(v))

    if (!hasImage && answers.length === 0) {
      throw new ValidationError('Provide an image or at least one damage detail.')
    }

    const answerText = answers.join(' | ') || 'none'
    const textModel = defaultGroqModel()
    const visionModel = groqVisionModel()

    const buildUserContent = (imageBlocked: string | null): unknown => {
      if (!hasImage) {
        return `Diagnose the damage described. Answers: ${answerText}`
      }
      return [
        {
          type: 'text',
          text: imageBlocked
            ? `A plant image was submitted, but it could NOT be analyzed (${imageBlocked}). Diagnose from the answers alone, with LOW confidence. Answers: ${answerText}`
            : `Diagnose the damage shown in this image. Answers: ${answerText}`,
        },
        ...(imageBlocked ? [] : [{ type: 'image_url' as const, image_url: { url: imageDataUrl } }]),
      ]
    }

    let content: string
    let usedVision = false
    let modelName = textModel

    if (hasImage) {
      // Every vision attempt is guarded: an outage must not become a 500.
      try {
        const gemini = await callGeminiVision({
          systemPrompt: SYSTEM_PROMPT,
          prompt: `Diagnose the damage shown in this image. Answers: ${answerText}`,
          imageDataUrl: imageDataUrl as string,
        })
        content = gemini.text
        usedVision = true
        modelName = gemini.model
      } catch {
        try {
          if (visionModel) {
            const groqVision = await callGroq({
              model: visionModel,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildUserContent(null) },
              ],
            })
            content = groqVision.text
            usedVision = true
            modelName = visionModel
          } else {
            throw new Error('no vision model configured')
          }
        } catch {
          content = (
            await callGroq({
              model: textModel,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: buildUserContent('no vision-capable model is available'),
                },
              ],
            })
          ).text
        }
      }
    } else {
      content = (
        await callGroq({
          model: textModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserContent(null) },
          ],
        })
      ).text
    }

    const parsed = extractJson(content)
    if (!parsed) {
      return res.status(502).json({
        error: 'The model returned an unparseable response. Please try again.',
      })
    }

    return res.status(200).json({
      result: {
        observedSymptoms: parsed.observedSymptoms ?? [],
        possibleGroups: parsed.possibleGroups ?? [],
        candidates: parsed.candidates ?? [],
        additionalObservations: parsed.additionalObservations ?? [],
        ipmAdvice: parsed.ipmAdvice ?? [],
        disclaimer: parsed.disclaimer ?? 'AI-assisted diagnosis. Confirm before chemical use.',
        visionUnavailable: hasImage && !usedVision,
        modelName,
      },
    })
  } catch (error) {
    sendError(res, error)
  }
}
