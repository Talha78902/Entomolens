import { tryGetSupabase } from '@/lib/supabase/client'

export interface SearchHit {
  category: 'insect' | 'crop' | 'taxonomy' | 'symptom' | 'reference'
  id: string
  title: string
  subtitle?: string | null
}

export interface GlobalSearchResult {
  insects: SearchHit[]
  crops: SearchHit[]
  taxonomy: SearchHit[]
  symptoms: SearchHit[]
  references: SearchHit[]
}

export async function globalSearch(term: string): Promise<GlobalSearchResult> {
  const empty: GlobalSearchResult = { insects: [], crops: [], taxonomy: [], symptoms: [], references: [] }
  const supabase = tryGetSupabase()
  const query = term.trim()
  if (!supabase || !query) return empty

  const like = `%${query}%`

  const [insects, crops, orders, families, genera, symptoms, references] = await Promise.all([
    supabase
      .from('insects')
      .select(
        `id, common_name, scientific_name, verification_status, taxonomic_genera(taxonomic_families(name, taxonomic_orders(name)))`,
      )
      .or(`common_name.ilike.${like},scientific_name.ilike.${like}`)
      .order('common_name')
      .limit(8),
    supabase.from('crops').select('id, name').ilike('name', like).limit(5),
    supabase.from('taxonomic_orders').select('id, name').ilike('name', like).limit(4),
    supabase.from('taxonomic_families').select('id, name').ilike('name', like).limit(4),
    supabase.from('taxonomic_genera').select('id, name').ilike('name', like).limit(4),
    supabase
      .from('damage_symptoms')
      .select('id, name, description')
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(5),
    supabase.from('scientific_references').select('id, title, year, authors, journal').ilike('title', like).limit(5),
  ])

  return {
    insects: (insects.data ?? []).map((insect) => {
      const record = insect as unknown as {
        id: string
        common_name: string
        scientific_name: string
        taxonomic_genera?: { taxonomic_families?: { name?: string; taxonomic_orders?: { name?: string } } } | null
      }
      const familyName = record.taxonomic_genera?.taxonomic_families?.name
      const orderName = record.taxonomic_genera?.taxonomic_families?.taxonomic_orders?.name
      return {
        category: 'insect',
        id: record.id,
        title: record.common_name,
        subtitle: [record.scientific_name, familyName, orderName].filter(Boolean).join(' · '),
      }
    }),
    crops: (crops.data ?? []).map((crop) => ({
      category: 'crop',
      id: (crop as { id: string }).id,
      title: (crop as { name: string }).name,
      subtitle: null,
    })),
    taxonomy: [
      ...(orders.data ?? []).map((order) => ({
        category: 'taxonomy' as const,
        id: (order as { id: string }).id,
        title: (order as { name: string }).name,
        subtitle: 'Order',
      })),
      ...(families.data ?? []).map((family) => ({
        category: 'taxonomy' as const,
        id: (family as { id: string }).id,
        title: (family as { name: string }).name,
        subtitle: 'Family',
      })),
      ...(genera.data ?? []).map((genus) => ({
        category: 'taxonomy' as const,
        id: (genus as { id: string }).id,
        title: (genus as { name: string }).name,
        subtitle: 'Genus',
      })),
    ],
    symptoms: (symptoms.data ?? []).map((symptom) => ({
      category: 'symptom',
      id: (symptom as { id: string }).id,
      title: (symptom as { name: string }).name,
      subtitle: (symptom as { description?: string }).description ?? null,
    })),
    references: (references.data ?? []).map((reference) => {
      const record = reference as { id: string; title: string; year?: number | null; authors?: string | null }
      return {
        category: 'reference',
        id: record.id,
        title: record.title,
        subtitle: [record.authors, record.year ?? ''].filter(Boolean).join(' · ') || null,
      }
    }),
  }
}