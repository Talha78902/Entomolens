import { tryGetSupabase } from '@/lib/supabase/client'
import type { Crop, DamageSymptom, Insect, LifeCycleStage } from '@/types/database'

export interface InsectListItem {
  id: string
  common_name: string
  scientific_name: string
  description: string
  images: string[] | null
  is_pest: boolean
  is_beneficial: boolean
  featured: boolean | null
  beneficial_category?: string | null
  order_name?: string | null
  family_name?: string | null
}

const insectListSelect = `
  id, common_name, scientific_name, description, images, is_pest, is_beneficial,
  featured, verification_status, beneficial_category,
  taxonomic_orders!insects_order_id_fkey(name),
  taxonomic_families!insects_family_id_fkey(name)
`

export interface MuseumFilters {
  search?: string
  orderId?: string
  familyId?: string
  type?: 'pest' | 'beneficial' | 'all'
  beneficialCategory?: string
  cropId?: string
  featured?: boolean
  page?: number
  pageSize?: number
}

export interface MuseumResult {
  items: InsectListItem[]
  count: number
}

function mapInsectRow(row: Record<string, unknown>): InsectListItem {
  const order = (row.taxonomic_orders as { name?: string } | null)?.name
  const family = (row.taxonomic_families as { name?: string } | null)?.name
  return {
    id: String(row.id),
    common_name: String(row.common_name ?? ''),
    scientific_name: String(row.scientific_name ?? ''),
    description: String(row.description ?? ''),
    images: Array.isArray(row.images) ? (row.images as string[]) : null,
    is_pest: Boolean(row.is_pest),
    is_beneficial: Boolean(row.is_beneficial),
    featured: row.featured == null ? null : Boolean(row.featured),
    beneficial_category: (row.beneficial_category as string | null) ?? null,
    order_name: order ?? null,
    family_name: family ?? null,
  }
}

export async function fetchInsectList(
  filters: MuseumFilters,
): Promise<MuseumResult> {
  const supabase = tryGetSupabase()
  if (!supabase) return { items: [], count: 0 }

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 24

  let cropPestIds: string[] | null = null
  if (filters.cropId) {
    const { data } = await supabase
      .from('crop_insects')
      .select('insect_id')
      .eq('crop_id', filters.cropId)
    cropPestIds = (data ?? []).map((row: { insect_id: string }) => row.insect_id)
  }

  let query = supabase
    .from('insects')
    .select(insectListSelect, { count: 'exact' })

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim()
    const [orderRows, familyRows] = await Promise.all([
      supabase.from('taxonomic_orders').select('id').ilike('name', `%${term}%`),
      supabase.from('taxonomic_families').select('id').ilike('name', `%${term}%`),
    ])
    const orderIds = (orderRows.data ?? []).map((row: { id: string }) => row.id)
    const familyIds = (familyRows.data ?? []).map((row: { id: string }) => row.id)
    const clauses = [
      `common_name.ilike.%${term}%`,
      `scientific_name.ilike.%${term}%`,
    ]
    if (orderIds.length > 0) clauses.push(`order_id.in.(${orderIds.join(',')})`)
    if (familyIds.length > 0) clauses.push(`family_id.in.(${familyIds.join(',')})`)
    query = query.or(clauses.join(','))
  }
  if (filters.orderId) query = query.eq('order_id', filters.orderId)
  if (filters.familyId) query = query.eq('family_id', filters.familyId)
  if (filters.cropId) {
    const ids = cropPestIds ?? []
    query = ids.length > 0 ? query.in('id', ids) : query.eq('id', '00000000-0000-0000-0000-000000000000')
  }
  if (filters.type === 'pest') query = query.eq('is_pest', true)
  if (filters.type === 'beneficial') query = query.eq('is_beneficial', true)
  if (filters.beneficialCategory) query = query.eq('beneficial_category', filters.beneficialCategory)
  if (filters.featured) query = query.eq('featured', true)

  query = query
    .order('common_name', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)

  const { data, count } = await query
  const items = (data ?? []).map(mapInsectRow)
  return { items, count: count ?? 0 }
}

export async function fetchInsectDetail(id: string) {
  const supabase = tryGetSupabase()
  if (!supabase) return null

  const { data } = await supabase
    .from('insects')
    .select(
      `*,
       taxonomic_orders!insects_order_id_fkey(name, common_name, description),
       taxonomic_families!insects_family_id_fkey(name, common_name, order_id),
       taxonomic_genera!insects_genus_id_fkey(name, family_id),
       crop_insects(crop_id, relationship_type, severity, crops(name)),
       insect_damage_symptoms(symptom_id, description, severity, damage_symptoms(name, category)),
       life_cycles(*),
       natural_enemy_relationships!natural_enemy_relationships_pest_insect_id_fkey(
         relationship, enemy_insect_id, insects!natural_enemy_relationships_enemy_insect_id_fkey(id, common_name, scientific_name)
       ),
       insect_management(notes, method_id, management_methods(name, category)),
       insect_scientific_references(reference_id, scientific_references(*))`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  return data as unknown as InsectDetailPayload
}

export interface InsectDetailPayload extends Insect {
  taxonomic_orders?: { name: string; common_name?: string | null; description?: string | null }
  taxonomic_families?: { name: string; common_name?: string | null; order_id: string }
  taxonomic_genera?: { name: string; family_id: string }
  crop_insects?: Array<{
    crop_id: string
    relationship_type: 'pest' | 'beneficial'
    severity?: string | null
    crops?: { name?: string } | null
  }>
  insect_damage_symptoms?: Array<{
    symptom_id: string
    description?: string | null
    severity?: string | null
    damage_symptoms?: { name?: string; category?: string } | null
  }>
  life_cycles?: LifeCycleStage[]
  natural_enemy_relationships?: Array<{
    relationship?: string
    enemy_insect_id?: string
    insects?: { common_name?: string; scientific_name?: string; id?: string } | null
  }>
  insect_management?: Array<{
    notes?: string | null
    method_id?: string
    management_methods?: { name?: string; category?: string } | null
  }>
  insect_scientific_references?: Array<{
    reference_id?: string
    scientific_references?: Record<string, unknown> | null
  }>
}

export async function fetchCrops(): Promise<Crop[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .order('name', { ascending: true })
  if (error) return []
  return (data ?? []) as Crop[]
}

export interface CropWithPests extends Crop {
  pests: Array<{ id: string; common_name: string; scientific_name: string }>
}

export async function fetchCropsWithPests(): Promise<CropWithPests[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('crops')
    .select('*, crop_insects(relationship_type, insects(id, common_name, scientific_name))')
    .order('name', { ascending: true })
  const rows = (data ?? []) as Array<
    Crop & {
      crop_insects?: Array<{
        relationship_type: string
        insects?: { id: string; common_name: string; scientific_name: string } | null
      }>
    }
  >
  return rows.map((row) => ({
    ...row,
    pests: (row.crop_insects ?? [])
      .filter((entry) => entry.relationship_type === 'pest' && entry.insects)
      .map((entry) => entry.insects!),
  }))
}

export async function fetchCropDetail(id: string) {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('crops')
    .select(
      `*,
       crop_insects(relationship_type, severity, notes,
         insects(id, common_name, scientific_name, description, is_pest, is_beneficial, images))`,
    )
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}

export async function fetchTaxonomy(
  kind: 'orders' | 'families' | 'genera',
  parentId?: string,
) {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const table = kind === 'orders' ? 'taxonomic_orders' : kind === 'families' ? 'taxonomic_families' : 'taxonomic_genera'
  let query = supabase.from(table).select('*').order('name', { ascending: true })
  if (kind === 'families' && parentId) query = query.eq('order_id', parentId)
  if (kind === 'genera' && parentId) query = query.eq('family_id', parentId)
  const { data } = await query
  return (data ?? []) as Array<Record<string, unknown>>
}

export async function fetchSymptoms(): Promise<DamageSymptom[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('damage_symptoms')
    .select('*')
    .order('name', { ascending: true })
  return (data ?? []) as DamageSymptom[]
}

export interface TaxonomyStatRow {
  id: string
  name: string
  common_name?: string | null
  description?: string | null
  speciesCount: number
  childrenCount: number
}

export interface TaxonomyStats {
  orders: TaxonomyStatRow[]
  familiesByOrder: Record<string, TaxonomyStatRow[]>
}

export async function fetchTaxonomyStats(): Promise<TaxonomyStats> {
  const supabase = tryGetSupabase()
  if (!supabase) return { orders: [], familiesByOrder: {} }

  const [ordersRes, familiesRes, insectsRes] = await Promise.all([
    supabase.from('taxonomic_orders').select('id, name, common_name, description').order('name'),
    supabase.from('taxonomic_families').select('id, name, common_name, order_id').order('name'),
    supabase.from('insects').select('id, order_id, family_id'),
  ])

  const orders = (ordersRes.data ?? []) as Array<{
    id: string
    name: string
    common_name?: string | null
    description?: string | null
  }>
  const families = (familiesRes.data ?? []) as Array<{
    id: string
    name: string
    common_name?: string | null
    order_id: string
  }>
  const insects = (insectsRes.data ?? []) as Array<{
    id: string
    order_id: string
    family_id: string
  }>

  const familyChildren = new Map<string, number>()
  const orderSpecies = new Map<string, number>()
  const orderChildren = new Map<string, number>()
  const familiesByOrder = new Map<string, TaxonomyStatRow[]>()

  for (const insect of insects) {
    orderSpecies.set(insect.order_id, (orderSpecies.get(insect.order_id) ?? 0) + 1)
    familyChildren.set(insect.family_id, (familyChildren.get(insect.family_id) ?? 0) + 1)
  }
  for (const family of families) {
    orderChildren.set(family.order_id, (orderChildren.get(family.order_id) ?? 0) + 1)
    const list = familiesByOrder.get(family.order_id) ?? []
    list.push({
      id: family.id,
      name: family.name,
      common_name: family.common_name,
      speciesCount: familyChildren.get(family.id) ?? 0,
      childrenCount: 0,
    })
    familiesByOrder.set(family.order_id, list)
  }

  const ordersOut = orders.map((order) => ({
    ...order,
    speciesCount: orderSpecies.get(order.id) ?? 0,
    childrenCount: orderChildren.get(order.id) ?? 0,
  }))

  return {
    orders: ordersOut,
    familiesByOrder: Object.fromEntries(familiesByOrder),
  }
}

export async function fetchLifeCycleStages() {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('life_cycles')
    .select(
      `*,
       insects(id, common_name, scientific_name, is_pest, is_beneficial)`,
    )
    .order('insect_id')
    .order('stage_order')
  return (data ?? []) as Array<Record<string, unknown>>
}