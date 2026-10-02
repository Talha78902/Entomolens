import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bug, ChevronDown, Clock, Egg } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchLifeCycleStages } from '@/services/knowledge'
import { LifeStageImage } from '@/components/lifecycle/LifeStageImage'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface LifeStageRow {
  id: string
  stage_order: number
  stage_name: string
  duration?: string | null
  appearance?: string | null
  feeding_behavior?: string | null
  damage_description?: string | null
  identification_characteristics?: string | null
  image_url?: string | null
  insects?: {
    id: string
    common_name: string
    scientific_name: string
    is_pest: boolean
    is_beneficial: boolean
  }
}

interface GroupedInsect {
  insect: NonNullable<LifeStageRow['insects']>
  stages: LifeStageRow[]
}

function StageTimeline({ stages, speciesName }: { stages: LifeStageRow[]; speciesName: string }) {
  const [selectedId, setSelectedId] = useState<string>(stages[0]?.id ?? '')
  const selected = stages.find((stage) => stage.id === selectedId) ?? stages[0]

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-3">
        {stages.map((stage, index) => {
          const active = (selected?.id ?? '') === stage.id
          return (
            <div key={stage.id} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedId(stage.id)}
                className="group flex flex-col items-center gap-1.5"
                aria-pressed={active}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white transition-all',
                    stageColors[stage.stage_name] ?? 'bg-forest-500',
                    active && 'scale-110 ring-2 ring-forest-800 ring-offset-2 ring-offset-cream-50',
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    active ? 'text-forest-900' : 'text-ink-400',
                  )}
                >
                  {stage.stage_name}
                </span>
                <LifeStageImage
                  src={stage.image_url}
                  alt={`${speciesName} ${stage.stage_name} stage`}
                  variant="chip"
                />
              </button>
              {index < stages.length - 1 && (
                <span className="h-px w-8 bg-forest-200" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
      {selected && (
        <div className="mt-2 rounded-xl border border-forest-100 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-serif capitalize text-base font-semibold text-forest-900">
              {selected.stage_name}
            </h4>
            {selected.duration && (
              <Badge tone="cream" className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {selected.duration}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row">
            <div className="sm:w-64">
              <LifeStageImage
                src={selected.image_url}
                alt={`Illustration of ${speciesName} at the ${selected.stage_name} stage`}
                variant="panel"
              />
            </div>
            <div className="min-w-0 flex-1">
              {selected.appearance && (
                <p className="text-sm text-ink-500">
                  <span className="font-medium text-ink-600">Appearance: </span>
                  {selected.appearance}
                </p>
              )}
              {selected.feeding_behavior && (
                <p className="mt-1 text-sm text-ink-500">
                  <span className="font-medium text-ink-600">Feeding: </span>
                  {selected.feeding_behavior}
                </p>
              )}
              {selected.damage_description && (
                <p className="mt-1 text-sm text-ink-500">
                  <span className="font-medium text-red-700">Damage: </span>
                  {selected.damage_description}
                </p>
              )}
              {selected.identification_characteristics && (
                <p className="mt-1 text-sm text-ink-500">
                  <span className="font-medium text-ink-600">Identify by: </span>
                  {selected.identification_characteristics}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const stageColors: Record<string, string> = {
  egg: 'bg-amber-200',
  larva: 'bg-forest-300',
  nymph: 'bg-forest-400',
  pupa: 'bg-leaf-400',
  adult: 'bg-leaf-600',
}

export function LifeCycleExplorerPage() {
  const configured = isSupabaseConfigured
  const [openSpecies, setOpenSpecies] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['life-cycles'],
    queryFn: fetchLifeCycleStages,
    enabled: configured,
  })

  const grouped = useMemo(() => {
    const rows = query.data as LifeStageRow[] | undefined
    if (!rows) return []
    const map = new Map<string, GroupedInsect>()
    for (const row of rows) {
      if (!row.insects) continue
      const existing = map.get(row.insects.id)
      if (existing) {
        existing.stages.push(row)
      } else {
        map.set(row.insects.id, { insect: row.insects, stages: [row] })
      }
    }
    return [...map.values()]
      .map((group) => ({ ...group, stages: [...group.stages].sort((a, b) => a.stage_order - b.stage_order) }))
      .sort((a, b) => a.insect.common_name.localeCompare(b.insect.common_name))
  }, [query.data])

  if (!configured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to explore life cycles."
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-2xl">
        <Badge tone="leaf" className="mb-3">
          Life-Cycle Explorer
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Life cycles</h1>
        <p className="mt-2 text-ink-400">
          A visual timeline of egg to adult for each species, including appearance, feeding behavior
          and which stage causes crop damage.
        </p>
      </header>

      {query.isLoading ? (
        <div className="mt-10 flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No life-cycle records"
          description="Species with life-cycle data will appear here."
        />
      ) : (
        <div className="mt-10 space-y-4">
          {grouped.map((group) => {
            const open = openSpecies === group.insect.id
            return (
              <Card key={group.insect.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSpecies(open ? null : group.insect.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={open}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-100">
                      <Bug className="h-6 w-6 text-forest-700" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-lg font-semibold text-forest-900">
                          {group.insect.common_name}
                        </h2>
                        {group.insect.is_pest && <Badge tone="red">Pest</Badge>}
                        {group.insect.is_beneficial && <Badge tone="leaf">Beneficial</Badge>}
                      </div>
                      <p className="text-sm italic text-ink-400">{group.insect.scientific_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-1 sm:flex">
                      {group.stages.map((stage) => (
                        <span
                          key={stage.id}
                          title={stage.stage_name}
                          className={cn('h-2.5 w-8 rounded-full', stageColors[stage.stage_name] ?? 'bg-cream-300')}
                        />
                      ))}
                    </div>
                    <ChevronDown
                      className={cn('h-5 w-5 shrink-0 text-forest-300 transition-transform', open && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-forest-100 bg-cream-50/40 p-5">
                    <StageTimeline stages={group.stages} speciesName={group.insect.common_name} />
                    <Link
                      to={`/museum/${group.insect.id}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
                    >
                      <Egg className="h-4 w-4" aria-hidden="true" />
                      Open full species profile
                    </Link>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}