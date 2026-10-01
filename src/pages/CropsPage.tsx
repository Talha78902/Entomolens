import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Leaf } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CropImage } from '@/components/crops/CropImage'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchCropsWithPests } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export function CropsPage() {
  const configured = isSupabaseConfigured
  const [searchParams] = useSearchParams()
  const highlightedName = searchParams.get('name') ?? ''
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const query = useQuery({
    queryKey: ['crops', 'list'],
    queryFn: fetchCropsWithPests,
    enabled: configured,
  })

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedName, query.data])

  if (!configured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to explore crops."
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-2xl">
        <Badge tone="leaf" className="mb-3">
          Crop Explorer
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Explore by crop</h1>
        <p className="mt-2 text-ink-400">
          Every crop links its major and minor pests, associated beneficial insects, damage
          symptoms and management guidance. Hover a crop to see its key pests.
        </p>
      </header>

      {query.isLoading ? (
        <div className="mt-10 flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          className="mt-10"
          title="No crops yet"
          description="Seed the database to add crop records."
        />
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.map((crop) => {
            const highlighted = highlightedName && crop.name === highlightedName
            const pests = crop.pests.slice(0, 4)
            return (
              <div key={crop.id} ref={highlighted ? highlightRef : undefined} className="h-full">
                <Link
                  to={`/crops/${crop.id}`}
                  className="group flex h-full min-h-60 flex-col justify-between rounded-xl border border-forest-100 bg-cream-50 p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <CropImage src={crop.image_url} alt={crop.name} variant="card" />

                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-leaf-700">
                      Crop
                    </span>
                    {highlighted && <Badge tone="leaf">Browse</Badge>}
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-forest-900 transition-colors group-hover:text-forest-700">
                      {crop.name}
                    </h2>
                    {crop.scientific_name && (
                      <p className="mt-0.5 text-sm italic text-ink-400">{crop.scientific_name}</p>
                    )}
                    <div className="mt-4 border-t border-forest-100 pt-3">
                      {pests.length > 0 ? (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                            Key pests
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {pests.map((pest) => (
                              <span
                                key={pest.id}
                                className="rounded-full border border-forest-100 bg-white px-2.5 py-0.5 text-xs text-ink-600"
                              >
                                {pest.common_name}
                              </span>
                            ))}
                            {crop.pests.length > pests.length && (
                              <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-500">
                                +{crop.pests.length - pests.length} more
                              </span>
                            )}
                          </div>
                        </>
                      ) : crop.region ? (
                        <p className="flex items-center gap-1.5 text-xs text-ink-400">
                          <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                          {crop.region}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-400">No reported pests.</p>
                      )}
                    </div>
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 transition-colors group-hover:text-forest-900">
                    Explore crop
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}