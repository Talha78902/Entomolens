import { isPublicBucket, parseImageRef, tryGetSupabase } from '@/lib/supabase/client'
import type { Visibility } from '@/types/database'

/**
 * Storage object names must be "<user_id>/<file>" to satisfy the per-user
 * RLS policies on the private buckets. Extensions are allow-listed so an
 * uploaded file cannot be stored with an unexpected type.
 */
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])

function buildObjectPath(userId: string, file: File): string {
  const raw = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const extension = ALLOWED_IMAGE_EXTENSIONS.has(raw) ? raw : 'jpg'
  return `${userId}/${crypto.randomUUID()}.${extension}`
}


export interface ObservationRow {
  id: string
  created_at: string
  updated_at?: string | null
  user_id: string
  insect_id: string
  crop_id?: string | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  observed_on: string
  image_path?: string | null
  life_stage?: string | null
  quantity?: number | null
  damage_level?: number | null
  notes?: string | null
  visibility: Visibility
  moderation_status?: 'pending' | 'approved' | 'rejected'
  insects?: {
    common_name: string
    scientific_name: string
    is_pest: boolean
    is_beneficial: boolean
  } | null
  crops?: { name: string } | null
}

export interface ObservationInput {
  insect_id: string
  crop_id?: string | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  observed_on: string
  image?: File | null
  life_stage?: string | null
  quantity?: number | null
  damage_level?: number | null
  notes?: string | null
  visibility: Visibility
}

export interface PublicObservationFilters {
  species?: string
  crop?: string
  type?: 'all' | 'pest' | 'beneficial'
  location?: string
  limit?: number
}

export async function fetchMyObservations(userId: string): Promise<ObservationRow[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('observations')
    .select(
      `*, insects(common_name, scientific_name, is_pest, is_beneficial), crops(name)`,
    )
    .eq('user_id', userId)
    .order('observed_on', { ascending: false })
  return (data ?? []) as ObservationRow[]
}

export async function fetchObservationById(userId: string, id: string): Promise<ObservationRow | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('observations')
    .select(
      `*, insects(common_name, scientific_name, is_pest, is_beneficial), crops(name)`,
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as ObservationRow | null) ?? null
}

export async function fetchPublicObservations(
  filters: PublicObservationFilters = {},
): Promise<ObservationRow[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  let query = supabase
    .from('observations')
    .select(`*, insects(common_name, scientific_name, is_pest, is_beneficial), crops(name)`)
    .eq('visibility', 'public')
    .eq('moderation_status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (filters.species) query = query.eq('insect_id', filters.species)
  if (filters.crop) query = query.eq('crop_id', filters.crop)
  if (filters.type === 'pest') {
    const { data: pestIds } = await supabase
      .from('insects')
      .select('id')
      .eq('is_pest', true)
    const ids = (pestIds ?? []).map((row: { id: string }) => row.id)
    query = query.in('insect_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }
  if (filters.type === 'beneficial') {
    const { data: beneficialIds } = await supabase
      .from('insects')
      .select('id')
      .eq('is_beneficial', true)
    const ids = (beneficialIds ?? []).map((row: { id: string }) => row.id)
    query = query.in('insect_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }
  if (filters.location) query = query.ilike('location_name', `%${filters.location}%`)

  query = query.order('created_at', { ascending: false }).limit(filters.limit ?? 500)
  const { data } = await query
  return (data ?? []) as ObservationRow[]
}

export async function createObservation(input: ObservationInput): Promise<string | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let imagePath: string | null = null
  if (input.image) {
    // Private-bucket policy requires the object name to start with the owner's
    // user id. A flat filename is rejected by RLS, which is why uploads used
    // to fail silently and produce observations with no photo.
    const path = buildObjectPath(user.id, input.image)
    const { error } = await supabase.storage
      .from('observation-images')
      .upload(path, input.image, { contentType: input.image.type, upsert: false })
    if (error) throw new Error(`Could not upload the observation photo: ${error.message}`)
    imagePath = path
  }

  const { data, error } = await supabase
    .from('observations')
    .insert({
      user_id: user.id,
      insect_id: input.insect_id,
      crop_id: input.crop_id || null,
      location_name: input.location_name || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      observed_on: input.observed_on,
      image_path: imagePath,
      life_stage: input.life_stage || null,
      quantity: input.quantity ?? null,
      damage_level: input.damage_level ?? null,
      notes: input.notes || null,
      visibility: input.visibility,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return (data as { id: string }).id
}

export async function updateObservation(userId: string, id: string, patch: Partial<ObservationInput>): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false

  let imagePath: string | null | undefined
  if (patch.image) {
    const path = buildObjectPath(userId, patch.image)
    const { error } = await supabase.storage
      .from('observation-images')
      .upload(path, patch.image, { contentType: patch.image.type, upsert: false })
    if (error) throw new Error(`Could not upload the observation photo: ${error.message}`)
    imagePath = path
  }

  const { error } = await supabase
    .from('observations')
    .update({
      insect_id: patch.insect_id,
      crop_id: patch.crop_id ?? null,
      location_name: patch.location_name ?? null,
      latitude: patch.latitude ?? null,
      longitude: patch.longitude ?? null,
      observed_on: patch.observed_on,
      ...(imagePath !== undefined && imagePath !== null ? { image_path: imagePath } : {}),
      life_stage: patch.life_stage ?? null,
      quantity: patch.quantity ?? null,
      damage_level: patch.damage_level ?? null,
      notes: patch.notes ?? null,
      visibility: patch.visibility,
    })
    .eq('id', id)
    .eq('user_id', userId)
  return !error
}

export async function deleteObservation(userId: string, id: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false

  const { data: observation } = await supabase
    .from('observations')
    .select('image_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  await supabase.from('research_project_observations').delete().eq('observation_id', id)

  const { error } = await supabase.from('observations').delete().eq('id', id).eq('user_id', userId)
  if (!error && observation?.image_path) {
    await supabase.storage.from('observation-images').remove([observation.image_path as string])
  }
  return !error
}

export function observationImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const parsed = parseImageRef(path, 'observation-images')
  if (!parsed) return null
  if ('external' in parsed) return parsed.external
  if (isPublicBucket(parsed.bucket)) {
    const { data } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.key)
    return data.publicUrl
  }
  // observation-images is private, so a public URL would 400. Callers that can
  // await should prefer useImageUrl(); this sync form is kept for render paths
  // that only need a best-effort value.
  return null
}

export function roundedCoordinates(latitude?: number | null, longitude?: number | null): { lat?: number; lng?: number } {
  if (latitude == null || longitude == null) return {}
  return { lat: Number(latitude.toFixed(2)), lng: Number(longitude.toFixed(2)) }
}