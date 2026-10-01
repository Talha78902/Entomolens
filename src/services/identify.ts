import { tryGetSupabase } from '@/lib/supabase/client'
import type { IdentificationResult } from '@/types/database'

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.82

export interface IdentifyContext {
  crop?: string
  symptoms?: string[]
  location?: string
  notes?: string
}

export interface IdentifySubmission {
  imageDataUrl?: string
  context: IdentifyContext
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function compressImage(dataUrl: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the image file.'))
    img.src = dataUrl
  })

  let { width, height } = image
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not supported in this browser.')
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export async function runIdentification(
  submission: IdentifySubmission,
): Promise<IdentificationResult> {
  const response = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl: submission.imageDataUrl,
      crop: submission.context.crop || null,
      symptoms: submission.context.symptoms ?? [],
      location: submission.context.location || null,
      notes: submission.context.notes || null,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Identification failed. Please try again.')
  }

  const data = (await response.json()) as { result: IdentificationResult }
  return data.result
}

export async function persistIdentification(input: {
  result: IdentificationResult
  imageDataUrl?: string
  context: IdentifyContext
}): Promise<string | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let imagePath: string | null = null
  if (input.imageDataUrl) {
    const bytes = dataUrlToBytes(input.imageDataUrl)
    // Per-user prefix is mandatory: the private-bucket RLS policies only allow
    // objects whose first path segment equals auth.uid(). A flat name is
    // rejected, and the error used to be swallowed.
    const path = `${user.id}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('identification-images')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) {
      throw new Error(`Could not save the identification photo: ${uploadError.message}`)
    }
    imagePath = path
  }

  // The identify form submits a crop NAME, but identifications.crop_id is a
  // foreign key. Resolve the name to its uuid, and fall back to null when the
  // text does not match a known crop rather than writing a bogus value.
  let cropId: string | null = null
  const cropName = input.context.crop?.trim()
  if (cropName) {
    const { data: crop } = await supabase
      .from('crops')
      .select('id')
      .ilike('name', cropName)
      .maybeSingle()
    cropId = (crop as { id: string } | null)?.id ?? null
  }

  const { data: identification, error } = await supabase
    .from('identifications')
    .insert({
      user_id: user.id,
      image_path: imagePath,
      crop_id: cropId,
      location_name: input.context.location || null,
      notes: input.context.notes || null,
      status: 'completed',
      model_name: input.result.modelName,
      result_summary: input.result.summary,
      top_insect_id: null,
    })
    .select('id')
    .single()


  if (error || !identification) return null

  const identificationId = (identification as { id: string }).id

  const candidates = input.result.candidates.map((candidate) => ({
    identification_id: identificationId,
    insect_id: candidate.insectId ?? null,
    rank: candidate.rank,
    confidence: candidate.confidence,
    confidence_label: candidate.confidenceLabel,
  }))

  await supabase.from('identification_candidates').insert(candidates)

  const evidence = input.result.entomoScore
  await supabase.from('identification_evidence').insert({
    identification_id: identificationId,
    image_evidence: evidence.image,
    crop_evidence: evidence.crop,
    symptom_evidence: evidence.symptom,
    observation_evidence: evidence.observation,
    overall_evidence: evidence.overall,
    notes: null,
  })

  return identificationId
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  if (!base64) return new Uint8Array()
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function fetchAllInsectNames(): Promise<Array<{ id: string; common_name: string; scientific_name: string }>> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('insects')
    .select('id, common_name, scientific_name')
    .order('common_name')
  return (data ?? []) as Array<{ id: string; common_name: string; scientific_name: string }>
}