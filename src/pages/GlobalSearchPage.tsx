import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bug, Flower2, Leaf, Search, SearchX, ScanSearch } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { globalSearch, type GlobalSearchResult, type SearchHit } from '@/services/search'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const SECTION_INFO: Record<
  SearchHit['category'],
  { key: keyof GlobalSearchResult; label: string; icon: typeof Bug; tone: 'leaf' | 'neutral' | 'amber' | 'red' }
> = {
  insect: { key: 'insects', label: 'Insects', icon: Bug, tone: 'leaf' },
  crop: { key: 'crops', label: 'Crops', icon: Flower2, tone: 'neutral' },
  taxonomy: { key: 'taxonomy', label: 'Taxonomy', icon: Leaf, tone: 'amber' },
  symptom: { key: 'symptoms', label: 'Symptoms', icon: ScanSearch, tone: 'red' },
  reference: { key: 'references', label: 'References', icon: BookOpen, tone: 'leaf' },
}

const SECTIONS: SearchHit['category'][] = ['insect', 'crop', 'taxonomy', 'symptom', 'reference']

export function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = searchParams.get('q') ?? ''
  const [term, setTerm] = useState(initial)
  const [debounced, setDebounced] = useState(initial)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timeout = window.setTimeout(() => setDebounced(term), 350)
    return () => window.clearTimeout(timeout)
  }, [term])

  useEffect(() => {
    setSearchParams(term ? { q: term } : {}, { replace: true })
  }, [debounced, term, setSearchParams])

  const query = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => globalSearch(debounced),
    enabled: isSupabaseConfigured && debounced.trim().length >= 2,
  })

  const result = query.data

  const totalHits =
    result == null
      ? 0
      : result.insects.length +
        result.crops.length +
        result.taxonomy.length +
        result.symptoms.length +
        result.references.length

  const renderSection = (category: SearchHit['category'], hits: SearchHit[]) => {
    if (hits.length === 0) return null
    const info = SECTION_INFO[category]
    const Icon = info.icon
    return (
      <section key={category} className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-forest-900">
          <Icon className="h-5 w-5 text-leaf-600" aria-hidden="true" />
          {info.label}
          <span className="text-sm font-normal text-ink-300">({hits.length})</span>
        </h2>
        <div className="space-y-2">
          {hits.map((hit) => {
            const to =
              category === 'insect'
                ? `/museum/${hit.id}`
                : category === 'crop'
                  ? `/crops?name=${encodeURIComponent(hit.title)}`
                  : category === 'taxonomy'
                    ? `/taxonomy${hit.subtitle === 'Order' ? `?order=${hit.id}` : ''}`
                    : category === 'symptom'
                      ? `/museum?q=${encodeURIComponent(hit.title)}`
                      : '/museum'
            return (
              <Link key={`${category}-${hit.id}`} to={to}>
                <Card className="transition-colors hover:border-leaf-500/60">
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-forest-900">{hit.title}</p>
                        {hit.subtitle && <p className="mt-0.5 truncate text-xs text-ink-400">{hit.subtitle}</p>}
                      </div>
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-[60vh]">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Search EntomoLens</h1>
        <p className="mt-1 text-sm text-ink-400">
          Find insects, crops, taxonomy, damage symptoms and references across the app.
        </p>
      </header>

      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Try “cotton”, “whitefly”, “Noctuidae”…"
          className="h-12 w-full rounded-xl border border-forest-200 bg-white pl-12 pr-4 text-base text-forest-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </div>

      {!isSupabaseConfigured ? (
        <EmptyState title="Database not configured" description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to search." />
      ) : debounced.trim().length < 2 ? (
        <EmptyState title="Start searching" description="Type at least two characters to search the knowledge base." />
      ) : query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : totalHits === 0 ? (
        <EmptyState
          icon={<SearchX className="h-10 w-10" aria-hidden="true" />}
          title={`No results for “${debounced}”`}
          description="Try a broader term, a crop name, or a family such as Noctuidae."
        />
      ) : (
        <div>
          <p className="mb-4 text-sm text-ink-400">
            {totalHits} result{totalHits === 1 ? '' : 's'} for “{debounced}”
          </p>
          {result &&
            SECTIONS.map((category) => renderSection(category, result[SECTION_INFO[category].key]))}
        </div>
      )}
    </div>
  )
}