import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bug, ChevronRight, Leaf, Sprout } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { InsectCard } from '@/components/insects/InsectCard'
import { fetchCropDetail } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { InsectListItem } from '@/services/knowledge'

interface CropInsectRow {
  relationship_type: 'pest' | 'beneficial'
  severity?: string | null
  notes?: string | null
  insects?: InsectListItem & { id: string }
}

export function CropDetailPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const configured = isSupabaseConfigured

  const query = useQuery({
    queryKey: ['crop', cropId],
    queryFn: () => fetchCropDetail(cropId ?? ''),
    enabled: configured && Boolean(cropId),
  })

  if (!configured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to view crop profiles."
        />
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const crop = query.data
  if (!crop) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Crop not found" description="The crop may have been removed." />
      </div>
    )
  }

  const rows = (crop.crop_insects ?? []) as unknown as CropInsectRow[]
  const pests = rows.filter((row) => row.relationship_type === 'pest')
  const beneficials = rows.filter((row) => row.relationship_type === 'beneficial')

  const toInsectItem = (row: CropInsectRow): InsectListItem => {
    const insect = row.insects ?? ({} as InsectListItem)
    return {
      id: insect.id,
      common_name: insect.common_name ?? '',
      scientific_name: insect.scientific_name ?? '',
      description: insect.description ?? '',
      images: insect.images ?? null,
      is_pest: insect.is_pest ?? row.relationship_type === 'pest',
      is_beneficial: insect.is_beneficial ?? row.relationship_type === 'beneficial',
      featured: insect.featured ?? null,
    }
  }

  return (
    <div className="container-page py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
          <li>
            <Link to="/crops" className="hover:text-forest-700">
              Crops
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-forest-800">{crop.name}</li>
        </ol>
      </nav>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {crop.image_url ? (
              <img
                src={crop.image_url}
                alt={crop.name}
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-cream-100">
                <Sprout className="h-8 w-8 text-leaf-600" aria-hidden="true" />
              </div>
            )}
            <div>
              <h1 className="font-serif text-3xl font-semibold text-forest-900">{crop.name}</h1>
              {crop.scientific_name && (
                <p className="mt-0.5 text-sm italic text-ink-400">{crop.scientific_name}</p>
              )}
              {crop.description && (
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-500">{crop.description}</p>
              )}
              {crop.region && (
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-400">
                  <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                  {crop.region}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mt-10">
        <header className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-red-600" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-semibold text-forest-900">
            Pests ({pests.length})
          </h2>
        </header>
        {pests.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No pests recorded"
            description="This crop has no associated pest species yet."
          />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pests.map((row) => (
              <div key={row.insects?.id} className="flex flex-col gap-2">
                <InsectCard insect={toInsectItem(row)} />
                {row.severity && (
                  <Badge tone={row.severity === 'major' ? 'red' : 'amber'} className="self-start">
                    {row.severity} pest
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <header className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-leaf-600" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-semibold text-forest-900">
            Beneficial insects ({beneficials.length})
          </h2>
        </header>
        {beneficials.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No beneficials recorded"
            description="Natural enemies for this crop are not yet catalogued."
          />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {beneficials.map((row) => (
              <InsectCard key={row.insects?.id} insect={toInsectItem(row)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}