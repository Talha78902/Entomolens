/**
 * Serverless API: /api/identify
 *
 * Provider keys are read from the server environment only, so they never reach
 * the browser. Vision falls back across Gemini models and then to a text-only
 * hypothesis, so a partial outage degrades confidence instead of failing hard.
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

const SYSTEM_PROMPT = `You are EntomoLens, a rigorous entomology identification assistant for agricultural insects.

Rules you MUST follow:
- Only propose identifications you can support with visible evidence or the context provided (crop, symptoms, region, notes).
- If the image or context is too unclear, say so honestly with a Low-confidence/Uncertain result. Never fabricate a confident match.
- Name model confidence as "model confidence" or "identification score". It is NOT a validated statistical probability.
- Never invent pesticide rates, concentrations, mixing instructions or legal-use claims.
- Use standard scientific names and inaturalist-style common names.
- If multiple plausible groups exist, return a ranked list of up to 5 candidates.

Respond ONLY with a single valid JSON object, no markdown, shaped exactly like:
{
  "candidates": [
    {
      "rank": 1,
      "commonName": "Whitefly",
      "scientificName": "Bemisia tabaci",
      "order": "Hemiptera",
      "family": "Aleyrodidae",
      "confidence": 87,
      "confidenceLabel": "High",
      "reasoning": "Short evidence-based reason referencing visible features and crop context.",
      "matchedCrops": ["Cotton", "Tomato"]
    }
  ],
  "summary": "One short paragraph summarising the likeliest identification and what supports it.",
  "disclaimer": "AI-assisted identification. Confirm with a specialist or microscope before using chemicals."
}`

interface IdentifyBody {
  imageDataUrl?: string | null
  imageUrl?: string | null
  crop?: string | null
  symptoms?: string[]
  location?: string | null
  notes?: string | null
}

function confidenceLabel(value: number): string {
  if (value >= 80) return 'High'
  if (value >= 60) return 'Moderate'
  if (value >= 40) return 'Low'
  return 'Uncertain'
}

function parseBody(raw: unknown): Required<Pick<IdentifyBody, 'crop' | 'location' | 'notes'>> & {
  symptoms: string[]
  imageSource: string
} {
  const body = (raw ?? {}) as IdentifyBody
  const crop = clampText(body.crop, 120)
  const location = clampText(body.location, 120)
  const notes = clampText(body.notes, 2000)
  const symptoms = Array.isArray(body.symptoms)
    ? body.symptoms.map((s) => clampText(s, 120)).filter((s): s is string => Boolean(s)).slice(0, 12)
    : []

  // clampText() would silently truncate an over-size data URL, leaving corrupt
  // base64 that the model then reads as a broken image. Reject instead so the
  // client can downscale and retry.
  const MAX_IMAGE_CHARS = 8 * 1024 * 1024
  const rawImage = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : null
  if (rawImage && rawImage.length > MAX_IMAGE_CHARS) {
    throw new ValidationError('That image is too large to analyse. Please use a smaller photo.')
  }
  const imageDataUrl = clampText(rawImage, MAX_IMAGE_CHARS)
  const imageUrl = clampText(body.imageUrl, 2048)
  const imageSource = imageDataUrl ?? imageUrl ?? ''

  if (!imageSource && !crop && !location && !notes && symptoms.length === 0) {
    throw new ValidationError('Provide an image or some context to identify.')
  }

  return { crop, location, notes, symptoms, imageSource }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res)) return

  try {
    const { crop, location, notes, symptoms, imageSource } = parseBody(req.body)
    const hasImage = Boolean(imageSource)
    const textModel = defaultGroqModel()
    const visionModel = groqVisionModel()

    const contextLines = [
      crop && `Crop: ${crop}`,
      location && `Location/region: ${location}`,
      symptoms.length > 0 ? `Observed symptoms: ${symptoms.join(', ')}` : null,
      notes && `Farmer notes: ${notes}`,
    ].filter(Boolean)
    const contextText =
      contextLines.length > 0 ? `Context: ${contextLines.join(' | ')}` : 'No additional context was provided.'

    const contextOnlyPrompt = (reason: string) =>
      `The image could NOT be analyzed (${reason}). Fall back to context-only, LOW confidence. ${contextText}.`

    let content: string
    let usedVision = false
    let modelName = textModel

    if (hasImage) {
      // 1. Preferred: Gemini vision, which already walks a model fallback chain.
      try {
        const gemini = await callGeminiVision({
          systemPrompt: SYSTEM_PROMPT,
          prompt: `Identify the insect in this image. ${contextText}.`,
          imageDataUrl: imageSource,
        })
        content = gemini.text
        usedVision = true
        modelName = gemini.model
      } catch (geminiError) {
        // 2. Groq vision model, if one is configured.
        if (visionModel) {
          try {
            const groqVision = await callGroq({
              model: visionModel,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Identify the insect in this image. ${contextText}.` },
                    { type: 'image_url', image_url: { url: imageSource } },
                  ],
                },
              ],
            })
            content = groqVision.text
            usedVision = true
            modelName = visionModel
          } catch {
            content = (
              await callGroq({
                model: textModel,
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  {
                    role: 'user',
                    content: contextOnlyPrompt(
                      geminiError instanceof Error ? 'vision provider unavailable' : 'vision failed',
                    ),
                  },
                ],
              })
            ).text
          }
        } else {
          // 3. Text-only hypothesis, explicitly labelled as such.
          content = (
            await callGroq({
              model: textModel,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: contextOnlyPrompt(
                    geminiError instanceof Error
                      ? 'vision provider unavailable'
                      : 'vision failed',
                  ),
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
            {
              role: 'user',
              content: `No image was provided. Use only the context below to give the most likely insect group(s). ${contextText}. Be explicit that this is based on context alone.`,
            },
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

    const rawCandidates = (parsed.candidates ?? []) as Array<{
      rank?: number
      commonName?: string
      scientificName?: string
      order?: string
      family?: string
      confidence?: number
      reasoning?: string
      matchedCrops?: string[]
    }>

    const candidates = rawCandidates
      .map((candidate, index) => {
        const confidenceRaw = Number(candidate.confidence)
        const confidence = Number.isFinite(confidenceRaw)
          ? Math.min(100, Math.max(0, confidenceRaw))
          : 50
        return {
          rank: candidate.rank ?? index + 1,
          commonName: candidate.commonName ?? 'Unknown',
          scientificName: candidate.scientificName ?? '',
          order: candidate.order ?? null,
          family: candidate.family ?? null,
          confidence,
          confidenceLabel: confidenceLabel(confidence),
          reasoning: candidate.reasoning ?? '',
          matchedCrops: Array.isArray(candidate.matchedCrops) ? candidate.matchedCrops : [],
        }
      })
      .sort((a, b) => a.rank - b.rank || b.confidence - a.confidence)
      .slice(0, 5)

    if (candidates.length === 0) {
      candidates.push({
        rank: 1,
        commonName: 'Unidentified',
        scientificName: '',
        order: null,
        family: null,
        confidence: 0,
        confidenceLabel: 'Uncertain',
        reasoning: 'No confident identification could be produced from the given evidence.',
        matchedCrops: [],
      })
    }

    const top = candidates[0]
    const score = (value: number) => Math.round(Math.min(100, Math.max(0, value)))
    const imageAnalyzed = hasImage && usedVision

    // Evidence weights are heuristic, documented, and not a calibrated probability.
    const imageEvidence = imageAnalyzed ? top.confidence : hasImage ? 35 : 0
    const cropEvidence = crop ? (top.matchedCrops?.some((c) => c?.toLowerCase() === crop?.toLowerCase()) ? 88 : 55) : 0
    const symptomEvidence = symptoms.length > 0 ? 82 : 0
    const observationEvidence = location || notes ? 92 : 0

    const activeScores = [imageEvidence, cropEvidence, symptomEvidence, observationEvidence].filter(
      (value) => value > 0,
    )
    const overall =
      activeScores.length > 0
        ? activeScores.reduce((sum, value) => sum + value, 0) / activeScores.length
        : top.confidence

    return res.status(200).json({
      result: {
        candidates,
        entomoScore: {
          image: score(imageEvidence),
          crop: score(cropEvidence),
          symptom: score(symptomEvidence),
          observation: score(observationEvidence),
          overall: score(overall),
        },
        summary: String(parsed.summary ?? candidates[0].reasoning ?? ''),
        disclaimer: String(
          parsed.disclaimer ?? 'AI-assisted identification. Confirm with a specialist before using chemicals.',
        ),
        modelName,
        visionUnavailable: hasImage && !imageAnalyzed,
      },
    })
  } catch (error) {
    sendError(res, error)
  }
}
