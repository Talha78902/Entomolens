import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Bug, ChevronLeft, ChevronRight, FilterX, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { InsectCard } from '@/components/insects/InsectCard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { fetchCrops, fetchInsectList, fetchTaxonomy } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const PAGE_SIZE = 24

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'pest', label: 'Pests only' },
  { value: 'beneficial', label: 'Beneficials' },
] as const

type TypeValue = (typeof TYPE_OPTIONS)[number]['value']

function useMuseumSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('q') ?? ''
  const orderId = searchParams.get('order') ?? ''
  const familyId = searchParams.get('family') ?? ''
  const cropId = searchParams.get('crop') ?? ''
  const type = (searchParams.get('type') as TypeValue) ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  /**
   * Apply several param changes in one navigation.
   *
   * Calling setParam twice in a row does not work: each call builds its next
   * state from the same `searchParams` snapshot, so the second call overwrites
   * the first and the earlier change is silently lost.
   */
  const applyParams = (entries: Array<[string, string]>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of entries) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const setParam = (key: string, value: string, resetPage = true) => {
    applyParams([[key, value]], resetPage)
  }

  const clearAll = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return { search, orderId, familyId, cropId, type, page, setParam, applyParams, clearAll }
}

interface FiltersPanelProps {
  search: string
  onSearchChange: (value: string) => void
  type: TypeValue
  orderId: string
  familyId: string
  cropId: string
  orders: Array<{ id: string; name: string }>
  families: Array<{ id: string; name: string }>
  crops: Array<{ id: string; name: string }>
  activeFilterCount: number
  onClear: () => void
  onSelectChange?: () => void
  className?: string
}

function FiltersPanel({
  search,
  onSearchChange,
  type,
  orderId,
  familyId,
  cropId,
  orders,
  families,
  crops,
  activeFilterCount,
  onClear,
  onSelectChange,
  className,
}: FiltersPanelProps) {
  const selectClass =
    'h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20'
  const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400'

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search insects…"
          className="h-10 w-full rounded-lg border border-forest-200 bg-cream-50 pl-11 pr-3 text-sm text-forest-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
          aria-label="Search insects"
        />
      </div>

      <label className="block">
        <span className={labelClass}>Type</span>
        <select
          value={type}
          onChange={(event) => {
            onSearchChange('type:' + event.target.value)
            onSelectChange?.()
          }}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="pest">Pests only</option>
          <option value="beneficial">Beneficials</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Order</span>
        <select value={orderId} onChange={(event) => { onSearchChange('order:' + event.target.value); onSelectChange?.() }} aria-label="Filter by order" className={selectClass}>
          <option value="">All orders</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Family</span>
        <select
          value={familyId}
          onChange={(event) => {
            onSearchChange('family:' + event.target.value)
            onSelectChange?.()
          }}
          disabled={!orderId}
          className={cn(selectClass, 'disabled:cursor-not-allowed disabled:opacity-50')}
          aria-label="Filter by family"
        >
          <option value="">{orderId ? 'All families' : 'Select an order first'}</option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Crop</span>
        <select value={cropId} onChange={(event) => { onSearchChange('crop:' + event.target.value); onSelectChange?.() }} aria-label="Filter by crop" className={selectClass}>
          <option value="">All crops</option>
          {crops.map((crop) => (
            <option key={crop.id} value={crop.id}>
              {crop.name}
            </option>
          ))}
        </select>
      </label>

      {activeFilterCount > 0 && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
        >
          <FilterX className="h-4 w-4" aria-hidden="true" /> Clear all filters
        </button>
      )}
    </div>
  )
}

export function MuseumPage() {
  const configured = isSupabaseConfigured
  const { search, orderId, familyId, cropId, type, page, setParam, applyParams, clearAll } =
    useMuseumSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 350)

  const ordersQuery = useQuery({
    queryKey: ['taxonomy', 'orders'],
    queryFn: () => fetchTaxonomy('orders'),
    enabled: configured,
  })
  const familiesQuery = useQuery({
    queryKey: ['taxonomy', 'families', orderId || 'all'],
    queryFn: () => fetchTaxonomy('families', orderId || undefined),
    enabled: configured && Boolean(orderId),
    placeholderData: keepPreviousData,
  })
  const cropsQuery = useQuery({
    queryKey: ['crops', 'list'],
    queryFn: fetchCrops,
    enabled: configured,
  })

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      orderId: orderId || undefined,
      familyId: familyId || undefined,
      cropId: cropId || undefined,
      type: type === 'all' ? undefined : type,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, orderId, familyId, cropId, type, page],
  )

  const listQuery = useQuery({
    queryKey: ['museum', filters],
    queryFn: () => fetchInsectList(filters),
    enabled: configured,
    placeholderData: keepPreviousData,
  })

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.count ?? 0) / PAGE_SIZE))
  const activeFilterCount = [search, orderId, familyId, cropId, type !== 'all'].filter(Boolean).length

  const orders: Array<{ id: string; name: string }> = (ordersQuery.data ?? []) as Array<{
    id: string
    name: string
  }>
  const families: Array<{ id: string; name: string }> = (familiesQuery.data ?? []) as Array<{
    id: string
    name: string
  }>
  const crops = cropsQuery.data ?? []

  const onParam = (raw: string) => {
    const sep = raw.indexOf(':')
    if (sep === -1) {
      setParam('q', raw)
      return
    }
    const key = raw.slice(0, sep)
    const value = raw.slice(sep + 1)
    if (key === 'q') setParam('q', value)
    else if (key === 'type') setParam('type', value === 'all' ? '' : value)
    else if (key === 'order') {
      // Selecting an order invalidates any family chosen under the old one.
      if (value) applyParams([['order', value], ['family', '']])
      else applyParams([['order', '']])
    } else if (key === 'family') setParam('family', value)
    else if (key === 'crop') setParam('crop', value)
  }

  const filtersPanelProps: FiltersPanelProps = {
    search,
    onSearchChange: onParam,
    type,
    orderId,
    familyId,
    cropId,
    orders,
    families,
    crops: crops.map((crop) => ({ id: crop.id, name: crop.name })),
    activeFilterCount,
    onClear: clearAll,
  }

  const mobileFiltersPanelProps: FiltersPanelProps = {
    ...filtersPanelProps,
    onSelectChange: () => setShowFilters(false),
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge tone="leaf" className="mb-3">
            Digital Collection
          </Badge>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Insect Museum</h1>
          <p className="mt-2 max-w-2xl text-ink-400">
            Browse verified insect species with taxonomy, crop relationships, symptoms and management
            guidance. Search by name, filter by order, family, crop or role.
          </p>
        </div>
      </header>

      {!configured ? (
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to browse the museum."
        />
      ) : (
        <>
          {/* Mobile: search + filter trigger */}
          <div className="mt-8 flex flex-col gap-3 lg:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setParam('q', event.target.value)}
                placeholder="Search by common or scientific name…"
                className="h-12 w-full rounded-lg border border-forest-200 bg-cream-50 pl-11 pr-4 text-sm text-forest-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                aria-label="Search insects"
              />
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowFilters(true)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-forest-800 px-2 text-xs text-cream-50">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-xl border border-forest-100 bg-white p-4 shadow-card">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                  Filters
                </p>
                <FiltersPanel {...filtersPanelProps} />
              </div>
            </aside>

            {/* Results */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-400">
                  {listQuery.isSuccess
                    ? `${listQuery.data.count} species${search ? ` for “${search}”` : ''}`
                    : 'Loading species…'}
                </p>
              </div>

              {activeFilterCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Active filters
                  </span>
                  {search && (
                    <button
                      onClick={() => setParam('q', '')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-medium text-cream-50 transition-colors hover:bg-forest-700"
                      aria-label={`Remove search “${search}”`}
                    >
                      “{search}”
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {type !== 'all' && (
                    <button
                      onClick={() => setParam('type', '')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-medium text-cream-50 transition-colors hover:bg-forest-700"
                      aria-label="Remove type filter"
                    >
                      {type === 'pest' ? 'Pests only' : 'Beneficials'}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {orderId && (
                    <button
                      onClick={() => applyParams([['order', ''], ['family', '']])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-medium text-cream-50 transition-colors hover:bg-forest-700"
                      aria-label="Remove order filter"
                    >
                      {orders.find((order) => order.id === orderId)?.name ?? orderId}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {familyId && (
                    <button
                      onClick={() => setParam('family', '')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-medium text-cream-50 transition-colors hover:bg-forest-700"
                      aria-label="Remove family filter"
                    >
                      {families.find((family) => family.id === familyId)?.name ?? familyId}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {cropId && (
                    <button
                      onClick={() => setParam('crop', '')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-medium text-cream-50 transition-colors hover:bg-forest-700"
                      aria-label="Remove crop filter"
                    >
                      {crops.find((crop) => crop.id === cropId)?.name ?? cropId}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {listQuery.isLoading ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-64 animate-pulse rounded-xl bg-cream-200/80" />
                  ))}
                </div>
              ) : (listQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  className="mt-6"
                  title="No insects found"
                  description="Try a different search term or clear some filters."
                  icon={<Bug className="h-10 w-10" aria-hidden="true" />}
                  action={
                    activeFilterCount > 0 ? (
                      <Button variant="secondary" onClick={clearAll}>
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="mt-6 columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">
                  {listQuery.data?.items.map((insect) => (
                    <div key={insect.id} className="mb-5 break-inside-avoid">
                      <InsectCard insect={insect} />
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setParam('page', String(page - 1), false)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter(
                        (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
                      )
                      .map((p, index, array) => {
                        const previous = array[index - 1]
                        return (
                          <span key={p} className="flex items-center gap-1">
                            {previous && p - previous > 1 && (
                              <span className="px-1 text-ink-300">…</span>
                            )}
                            <button
                              onClick={() => setParam('page', String(p), false)}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                                p === page
                                  ? 'bg-forest-800 text-cream-50'
                                  : 'text-forest-700 hover:bg-forest-100',
                              )}
                              aria-current={p === page ? 'page' : undefined}
                            >
                              {p}
                            </button>
                          </span>
                        )
                      })}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setParam('page', String(page + 1), false)}
                  >
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
              )}
            </div>
          </div>
        </>
      )}

      {configured && (
        <p className="mt-12 rounded-xl bg-cream-100/60 p-4 text-center text-xs text-ink-400">
          <Link to="/taxonomy" className="font-medium text-forest-700 hover:text-forest-900">
            Explore the full taxonomy
          </Link>{' '}
          or view{' '}
          <Link to="/beneficial-insects" className="font-medium text-forest-700 hover:text-forest-900">
            beneficial insects only
          </Link>
          .
        </p>
      )}

      {/* Mobile bottom sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div
            className="absolute inset-0 bg-forest-900/30 backdrop-blur-[1px]"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-forest-100 bg-cream-50 p-5 pb-24">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-forest-200" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-400">
                Filters
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
                >
                  <FilterX className="h-4 w-4" aria-hidden="true" /> Clear
                </button>
              )}
            </div>
            <FiltersPanel {...mobileFiltersPanelProps} />
            <Button fullWidth className="mt-5" onClick={() => setShowFilters(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}