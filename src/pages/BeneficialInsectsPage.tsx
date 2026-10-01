import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandHeart, Bug, Flower2, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { InsectCard } from '@/components/insects/InsectCard'
import { fetchInsectList } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { value: '', label: 'All beneficials', icon: HandHeart },
  { value: 'predator', label: 'Predators', icon: Bug },
  { value: 'parasitoid', label: 'Parasitoids', icon: ShieldCheck },
  { value: 'pollinator', label: 'Pollinators', icon: Flower2 },
] as const

export function BeneficialInsectsPage() {
  const configured = isSupabaseConfigured
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('')

  const query = useQuery({
    queryKey: ['beneficial-insects', category],
    queryFn: () =>
      fetchInsectList({
        type: 'beneficial',
        beneficialCategory: category || undefined,
        pageSize: 100,
      }),
    enabled: configured,
  })

  const insects = useMemo(() => query.data?.items ?? [], [query.data])

  const grouped = useMemo(() => {
    const byCategory = new Map<string, typeof insects>()
    for (const insect of insects) {
      const key = insect.beneficial_category ?? 'other'
      const list = byCategory.get(key) ?? []
      list.push(insect)
      byCategory.set(key, list)
    }
    return byCategory
  }, [insects])

  const categoryTitles: Record<string, string> = {
    predator: 'Predators',
    parasitoid: 'Parasitoids',
    pollinator: 'Pollinators',
    other: 'Other beneficials',
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-2xl">
        <Badge tone="leaf" className="mb-3">
          Allies of Agriculture
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Beneficial insects</h1>
        <p className="mt-2 text-ink-400">
          Predators, parasitoids and pollinators that protect crops naturally. Support them and
          reduce dependence on pesticides.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => {
          const Icon = item.icon
          const active = category === item.value
          return (
            <button
              key={item.value}
              onClick={() => setCategory(item.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-forest-800 bg-forest-800 text-cream-50'
                  : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
              )}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              {category !== item.value && insects.length > 0 && item.value === '' && (
                <span className="text-xs opacity-70">{insects.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {!configured ? (
        <EmptyState
          className="mt-10"
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to browse beneficial insects."
        />
      ) : query.isLoading ? (
        <div className="mt-10 flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : insects.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No beneficial insects found"
          description="Try another category."
          action={
            category ? (
              <Button variant="secondary" onClick={() => setCategory('')}>
                Show all
              </Button>
            ) : undefined
          }
        />
      ) : category ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {insects.map((insect) => (
            <InsectCard key={insect.id} insect={insect} />
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {Array.from(grouped.entries()).map(([key, list]) => (
            <section key={key}>
              <div className="flex items-baseline justify-between gap-4 border-b border-forest-100 pb-3">
                <h2 className="font-serif text-2xl font-semibold text-forest-900">
                  {categoryTitles[key] ?? categoryTitles.other ?? 'Beneficials'}
                </h2>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf-700">
                  {list.length} species
                </span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((insect) => (
                  <InsectCard key={insect.id} insect={insect} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}