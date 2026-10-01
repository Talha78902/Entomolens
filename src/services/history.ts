import { tryGetSupabase } from '@/lib/supabase/client'

/** Identifications loaded per history page. */
const HISTORY_PAGE_SIZE = 50

export interface IdentificationRow {
  id: string
  created_at: string
  image_path?: string | null
  location_name?: string | null
  status: string
  model_name?: string | null
  result_summary?: string | null
  top_insect_id?: string | null
  candidates?: IdentificationCandidateRow[] | null
}

export interface IdentificationCandidateRow {
  id: string
  rank: number
  confidence: number
  confidence_label?: string | null
  insects?: {
    id: string
    common_name: string
    scientific_name: string
  } | null
}

export async function fetchMyIdentifications(userId: string): Promise<IdentificationRow[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []

  const listRes = await supabase
    .from('identifications')
    .select('id, created_at, image_path, location_name, status, model_name, result_summary, top_insect_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_PAGE_SIZE)

  const list = (listRes.data ?? []) as Array<Omit<IdentificationRow, 'candidates'>>
  if (list.length === 0) return []

  // Only fetch candidates for the page we just loaded. Previously this query
  // had no filter at all, so it pulled every candidate row in the table and
  // discarded all but 50 identifications' worth in memory.
  const ids = list.map((row) => row.id)
  const candidatesRes = await supabase
    .from('identification_candidates')
    .select('id, rank, confidence, confidence_label, identification_id, insects(id, common_name, scientific_name)')
    .in('identification_id', ids)
    .order('rank', { ascending: true })

  const allCandidates = candidatesRes.data as
    | Array<IdentificationCandidateRow & { identification_id: string }>
    | null

  const byIdentification = new Map<string, IdentificationCandidateRow[]>()
  for (const candidate of allCandidates ?? []) {
    const existing = byIdentification.get(candidate.identification_id) ?? []
    existing.push(candidate)
    byIdentification.set(candidate.identification_id, existing)
  }

  return list.map((identification) => ({
    ...identification,
    candidates: byIdentification.get(identification.id) ?? [],
  }))
}

export async function deleteIdentification(userId: string, identificationId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { data: identification } = await supabase
    .from('identifications')
    .select('image_path')
    .eq('id', identificationId)
    .eq('user_id', userId)
    .maybeSingle()

  await supabase
    .from('identification_evidence')
    .delete()
    .eq('identification_id', identificationId)
  await supabase
    .from('identification_candidates')
    .delete()
    .eq('identification_id', identificationId)

  const { error } = await supabase
    .from('identifications')
    .delete()
    .eq('id', identificationId)
    .eq('user_id', userId)

  if (!error && identification?.image_path) {
    await supabase.storage.from('identification-images').remove([identification.image_path as string])
  }
  return !error
}