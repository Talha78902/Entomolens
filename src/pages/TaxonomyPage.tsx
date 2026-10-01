import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bug, ChevronDown, Layers, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchTaxonomyStats } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

export function TaxonomyPage() {
  const configured = isSupabaseConfigured
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOrder = searchParams.get('order') ?? ''
  const [expandedOrder, setExpandedOrder] = useState<string | null>(selectedOrder || null)

  const query = useQuery({
    queryKey: ['taxonomy', 'stats'],
    queryFn: fetchTaxonomyStats,
    enabled: configured,
  })

  const selectOrder = (orderId: string) => {
    setExpandedOrder((current) => (current === orderId ? null : orderId))
    const next = new URLSearchParams(searchParams)
    if (orderId) next.set('order', orderId)
    else next.delete('order')
    setSearchParams(next, { replace: true })
  }

  const orders = useMemo(
    () => (query.data?.orders ?? []).sort((a, b) => a.speciesCount - b.speciesCount).reverse(),
    [query.data],
  )

  if (!configured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to explore taxonomy."
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-2xl">
        <Badge tone="leaf" className="mb-3">
          Taxonomy
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
          Explore the tree of insects
        </h1>
        <p className="mt-2 text-ink-400">
          Drilling down from order to family to species. Every profile is linked to the verified
          species records in the Insect Museum.
        </p>
      </header>

      {query.isLoading || (query.data && orders.length === 0) ? (
        <div className="mt-10 flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No taxonomy data"
          description="Seed the database to populate orders, families and species."
        />
      ) : (
        <div className="mt-10 space-y-10">
          {/* Orders */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const families = query.data?.familiesByOrder[order.id] ?? []
              const open = expandedOrder === order.id
              return (
                <Card
                  key={order.id}
                  className={cn('transition-shadow', open && 'ring-2 ring-leaf-500/30')}
                >
                  <button
                    type="button"
                    onClick={() => selectOrder(order.id)}
                    className="flex w-full items-start justify-between gap-3 p-5 text-left"
                    aria-expanded={open}
                  >
                    <div>
                      <h2 className="font-serif text-xl font-semibold text-forest-900">
                        {order.name}
                      </h2>
                      {order.common_name && (
                        <p className="mt-0.5 text-sm text-ink-400">{order.common_name}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="cream">
                          {order.speciesCount} species
                        </Badge>
                        <Badge tone="neutral">
                          {order.childrenCount} families
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 h-5 w-5 shrink-0 text-forest-300 transition-transform',
                        open && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {open && (
                    <CardContent className="space-y-2 border-t border-forest-100 pt-4">
                      {order.description && (
                        <p className="text-sm leading-relaxed text-ink-500">{order.description}</p>
                      )}
                      {families.length > 0 ? (
                        <ul className="space-y-1.5">
                          {families.map((family) => (
                            <li key={family.id}>
                              <Link
                                to={`/museum?order=${encodeURIComponent(order.id)}&family=${encodeURIComponent(family.id)}`}
                                className="group flex items-center justify-between gap-2 rounded-lg border border-forest-100 px-3 py-2 transition-colors hover:border-leaf-500 hover:bg-cream-50"
                              >
                                <span className="flex items-center gap-2 text-sm font-medium text-forest-800">
                                  <Tag className="h-3.5 w-3.5 text-leaf-600" aria-hidden="true" />
                                  {family.name}
                                  {family.common_name && (
                                    <span className="font-normal text-ink-400">
                                      ({family.common_name})
                                    </span>
                                  )}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-ink-400">
                                  <Bug className="h-3.5 w-3.5" aria-hidden="true" />
                                  {family.speciesCount}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-ink-400">No families recorded for this order.</p>
                      )}
                      <Link
                        to={`/museum?order=${encodeURIComponent(order.id)}`}
                        className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-forest-700 hover:text-forest-900"
                      >
                        All {order.speciesCount} species <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Legend / explanation */}
          <Card className="bg-cream-100/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                How taxonomy works here
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-ink-500">
                Species are grouped into families, which belong to orders. The Insect Museum, life
                cycles and beneficial-insect guides all reference this same verified taxonomy, so a
                specimen identified in one area stays consistent everywhere on EntomoLens.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}