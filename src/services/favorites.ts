import { tryGetSupabase } from '@/lib/supabase/client'

export interface FavoriteInsectRow {
  id: string
  created_at: string
  insect: {
    id: string
    common_name: string
    scientific_name: string
    description: string
    images: string[] | null
    is_pest: boolean
    is_beneficial: boolean
  }
}

export async function fetchFavorites(userId: string): Promise<FavoriteInsectRow[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('favorite_insects')
    .select('id, created_at, insects(id, common_name, scientific_name, description, images, is_pest, is_beneficial)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as unknown as Array<{
    id: string
    created_at: string
    insects?: {
      id: string
      common_name: string
      scientific_name: string
      description: string
      images: string[] | null
      is_pest: boolean
      is_beneficial: boolean
    } | null
  }>
  return rows
    .filter((row) => row.insects)
    .map((row) => ({ id: row.id, created_at: row.created_at, insect: row.insects! }))
}

export async function removeFavorite(userId: string, insectId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('favorite_insects')
    .delete()
    .eq('user_id', userId)
    .eq('insect_id', insectId)
  return !error
}

export async function isFavorite(userId: string, insectId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { data } = await supabase
    .from('favorite_insects')
    .select('id')
    .eq('user_id', userId)
    .eq('insect_id', insectId)
    .maybeSingle()
  return Boolean(data)
}

export async function toggleFavorite(userId: string, insectId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const already = await isFavorite(userId, insectId)
  if (already) {
    return removeFavorite(userId, insectId)
  }
  const { error } = await supabase.from('favorite_insects').insert({
    user_id: userId,
    insect_id: insectId,
  })
  return !error
}