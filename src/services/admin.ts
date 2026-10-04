import { tryGetSupabase } from '@/lib/supabase/client'

export interface AdminStats {
  insects: number
  drafts: number
  crops: number
  orders: number
  families: number
  genera: number
  references: number
  users: number
  observations: number
  pendingObservations: number
  identifications: number
}

export interface AdminUser {
  id: string
  created_at: string
  full_name?: string | null
  role: string
  institution?: string | null
  region?: string | null
}

export type RoleValue = 'student' | 'farmer' | 'researcher' | 'entomologist' | 'admin'

export const ROLES: RoleValue[] = ['student', 'farmer', 'researcher', 'entomologist', 'admin']

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const [insects, drafts, crops, orders, families, genera, references, users, observations, pending, identifications] =
    await Promise.all([
      supabase.from('insects').select('id', { count: 'exact', head: true }),
      supabase.from('insects').select('id', { count: 'exact', head: true }).eq('verification_status', 'draft'),
      supabase.from('crops').select('id', { count: 'exact', head: true }),
      supabase.from('taxonomic_orders').select('id', { count: 'exact', head: true }),
      supabase.from('taxonomic_families').select('id', { count: 'exact', head: true }),
      supabase.from('taxonomic_genera').select('id', { count: 'exact', head: true }),
      supabase.from('scientific_references').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('observations').select('id', { count: 'exact', head: true }),
      supabase.from('observations').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabase.from('identifications').select('id', { count: 'exact', head: true }),
    ])
  return {
    insects: insects.count ?? 0,
    drafts: drafts.count ?? 0,
    crops: crops.count ?? 0,
    orders: orders.count ?? 0,
    families: families.count ?? 0,
    genera: genera.count ?? 0,
    references: references.count ?? 0,
    users: users.count ?? 0,
    observations: observations.count ?? 0,
    pendingObservations: pending.count ?? 0,
    identifications: identifications.count ?? 0,
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, created_at, full_name, role, institution, region')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []) as AdminUser[]
}

export async function setUserRole(userId: string, role: RoleValue): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  return !error
}

export async function fetchAdminObservations(): Promise<Array<Record<string, unknown>>> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('observations')
    .select(
      `id, created_at, observed_on, location_name, visibility, moderation_status,
       insects(common_name, scientific_name), crops(name), profiles(full_name)`,
    )
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) {
    console.error('Failed to fetch admin observations:', error)
    return []
  }
  return (data ?? []) as Array<Record<string, unknown>>
}

export async function setObservationModerationStatus(
  observationId: string,
  status: 'pending' | 'approved' | 'rejected',
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('observations')
    .update({ moderation_status: status })
    .eq('id', observationId)
  return !error
}

export async function deleteObservationAdmin(observationId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  await supabase.from('research_project_observations').delete().eq('observation_id', observationId)
  const { error } = await supabase.from('observations').delete().eq('id', observationId)
  return !error
}

export interface AdminInsectRow {
  id: string
  common_name: string
  scientific_name: string
  verification_status: 'draft' | 'reviewed' | 'verified'
  featured: boolean
  created_at: string
  families?: { name?: string } | null
}

export async function fetchAdminInsects(): Promise<AdminInsectRow[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('insects')
    .select('id, common_name, scientific_name, verification_status, featured, created_at, families(name)')
    .order('common_name')
    .limit(500)
  return (data ?? []) as AdminInsectRow[]
}

export async function setInsectStatus(
  id: string,
  status: 'draft' | 'reviewed' | 'verified',
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('insects').update({ verification_status: status }).eq('id', id)
  return !error
}

export async function setInsectFeatured(id: string, featured: boolean): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('insects').update({ featured }).eq('id', id)
  return !error
}

export async function deleteInsectAdmin(id: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('insects').delete().eq('id', id)
  return !error
}

export async function fetchAdminCrops(): Promise<
  Array<{ id: string; name: string; scientific_name?: string | null; created_at: string }>
> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('crops')
    .select('id, name, scientific_name, created_at')
    .order('name')
    .limit(500)
  return (data ?? []) as Array<{ id: string; name: string; scientific_name?: string | null; created_at: string }>
}

export async function createCropAdmin(input: { name: string; scientific_name?: string | null }): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('crops').insert({
    name: input.name,
    scientific_name: input.scientific_name || null,
  })
  return !error
}

export async function updateCropAdmin(
  id: string,
  input: { name: string; scientific_name?: string | null },
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('crops')
    .update({ name: input.name, scientific_name: input.scientific_name || null })
    .eq('id', id)
  return !error
}

export async function deleteCropAdmin(id: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('crops').delete().eq('id', id)
  return !error
}

export async function fetchAdminReferences(): Promise<
  Array<{ id: string; title: string; authors?: string[] | null; year?: number | null; journal?: string | null; created_at: string }>
> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('scientific_references')
    .select('id, title, authors, year, journal, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as Array<{
    id: string
    title: string
    authors?: string | null
    year?: number | null
    journal?: string | null
    created_at: string
  }>
}

export async function createReferenceAdmin(input: {
  title: string
  authors?: string[] | null
  year?: number | null
  journal?: string | null
}): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('scientific_references').insert({
    title: input.title,
    authors: input.authors || null,
    year: input.year ?? null,
    journal: input.journal || null,
  })
  return !error
}

export async function updateReferenceAdmin(
  id: string,
  input: { title: string; authors?: string[] | null; year?: number | null; journal?: string | null },
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('scientific_references')
    .update({ title: input.title, authors: input.authors || null, year: input.year ?? null, journal: input.journal || null })
    .eq('id', id)
  return !error
}

export async function deleteReferenceAdmin(id: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('scientific_references').delete().eq('id', id)
  return !error
}

export async function fetchTaxonomyAdmin() {
  const supabase = tryGetSupabase()
  if (!supabase) return { orders: [], families: [], genera: [] }
  const [orders, families, genera] = await Promise.all([
    supabase.from('taxonomic_orders').select('id, name, description, created_at').order('name'),
    supabase.from('taxonomic_families').select('id, order_id, name, description, created_at').order('name'),
    supabase.from('taxonomic_genera').select('id, family_id, name, description, created_at').order('name'),
  ])
  return {
    orders: (orders.data ?? []) as Array<{ id: string; name: string; description?: string | null; created_at: string }>,
    families: (families.data ?? []) as Array<{
      id: string
      order_id: string
      name: string
      description?: string | null
      created_at: string
    }>,
    genera: (genera.data ?? []) as Array<{
      id: string
      family_id: string
      name: string
      description?: string | null
      created_at: string
    }>,
  }
}

export async function createOrderAdmin(input: { name: string; description?: string | null }): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_orders')
    .insert({ name: input.name, description: input.description || null })
  return !error
}

export async function createFamilyAdmin(input: {
  order_id: string
  name: string
  description?: string | null
}): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_families')
    .insert({ order_id: input.order_id, name: input.name, description: input.description || null })
  return !error
}

export async function createGenusAdmin(input: {
  family_id: string
  name: string
  description?: string | null
}): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_genera')
    .insert({ family_id: input.family_id, name: input.name, description: input.description || null })
  return !error
}

export async function updateFamilyAdmin(
  id: string,
  input: { order_id: string; name: string; description?: string | null },
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_families')
    .update({ order_id: input.order_id, name: input.name, description: input.description || null })
    .eq('id', id)
  return !error
}

export async function updateOrderAdmin(
  id: string,
  input: { name: string; description?: string | null },
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_orders')
    .update({ name: input.name, description: input.description || null })
    .eq('id', id)
  return !error
}

export async function updateGenusAdmin(
  id: string,
  input: { family_id: string; name: string; description?: string | null },
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('taxonomic_genera')
    .update({ family_id: input.family_id, name: input.name, description: input.description || null })
    .eq('id', id)
  return !error
}

export async function deleteTaxonomyAdmin(table: 'orders' | 'families' | 'genera', id: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const map = { orders: 'taxonomic_orders', families: 'taxonomic_families', genera: 'taxonomic_genera' }
  const { error } = await supabase.from(map[table]).delete().eq('id', id)
  return !error
}