import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Leaf,
  Library,
  LifeBuoy,
  MapPin,
  Shield,
  Sprout,
  Star,
  Tractor,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { fetchInsectDetail } from '@/services/knowledge'
import { isFavorite, toggleFavorite } from '@/services/favorites'
import { useAuth } from '@/hooks/useAuth'
import { useImageUrl } from '@/hooks/useImageUrl'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { InsectDetailPayload } from '@/services/knowledge'

const verificationTone: Record<string, 'leaf' | 'amber' | 'neutral'> = {
  verified: 'leaf',
  reviewed: 'amber',
  draft: 'neutral',
}

const severityTone: Record<string, 'red' | 'amber' | 'neutral'> = {
  major: 'red',
  minor: 'amber',
  occasional: 'neutral',
}

function useHeroImage(paths: string[] | null | undefined) {
  const [failed, setFailed] = useState(false)
  const path = paths?.[0]
  const url = useImageUrl(failed ? null : path, 'insect-images')
  return { url, failed, setFailed }
}

function TaxonomyRow({ label, value, to }: { label: string; value: string; to?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</span>
      {to ? (
        <Link to={to} className="text-sm font-medium text-forest-700 hover:text-forest-900">
          {value}
        </Link>
      ) : (
        <span className="text-sm font-medium text-ink-600">{value}</span>
      )}
    </div>
  )
}

export function InsectDetailPage() {
  const { insectId } = useParams<{ insectId: string }>()
  const configured = isSupabaseConfigured

  const query = useQuery({
    queryKey: ['insect', insectId],
    queryFn: () => fetchInsectDetail(insectId ?? ''),
    enabled: configured && Boolean(insectId),
  })

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const favoriteQuery = useQuery({
    queryKey: ['favorite', user?.id, insectId],
    queryFn: () => (user && insectId ? isFavorite(user.id, insectId) : false),
    enabled: Boolean(user && insectId) && isSupabaseConfigured,
  })
  const favorited = favoriteQuery.data ?? false

  const handleToggleFavorite = async () => {
    if (!user || !insectId || favoriteBusy) return
    setFavoriteBusy(true)
    await toggleFavorite(user.id, insectId)
    await queryClient.invalidateQueries({ queryKey: ['favorite', user.id, insectId] })
    await queryClient.invalidateQueries({ queryKey: ['favorites'] })
    setFavoriteBusy(false)
  }

  const insect = query.data as InsectDetailPayload | null
  const { url, setFailed } = useHeroImage(insect?.images)

  if (!configured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to view insect profiles."
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

  if (!insect) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Insect not found"
          description="This species may have been removed or the link is invalid."
          action={
            <Link to="/museum">
              <ButtonBack />
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
          <li>
            <Link to="/museum" className="hover:text-forest-700">
              Museum
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li>
            <Link
              to={`/museum?order=${encodeURIComponent(insect.order_id ?? '')}`}
              className="hover:text-forest-700"
            >
              {insect.taxonomic_orders?.name ?? 'Order'}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="truncate font-medium text-forest-800">{insect.common_name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              {insect.verification_status && (
                <Badge tone={verificationTone[insect.verification_status] ?? 'neutral'}>
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  {insect.verification_status.charAt(0).toUpperCase() + insect.verification_status.slice(1)}
                </Badge>
              )}
              {insect.is_pest && <Badge tone="red">Pest</Badge>}
              {insect.is_beneficial && (
                <Badge tone="leaf">
                  {insect.beneficial_category ?? 'Beneficial'}
                </Badge>
              )}
              {insect.featured && <Badge tone="amber">Featured</Badge>}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">
              {insect.common_name}
            </h1>
            <p className="mt-1 text-lg italic text-ink-400">{insect.scientific_name}</p>
            {insect.native_region && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-400">
                <MapPin className="h-4 w-4 text-leaf-600" aria-hidden="true" />
                Native region: {insect.native_region}
              </p>
            )}
          </header>

          {/* Hero image */}
          <div className="overflow-hidden rounded-2xl border border-forest-100 bg-cream-100">
            <div className="relative flex h-72 items-center justify-center">
              {url ? (
                <img
                  src={url}
                  alt={insect.common_name}
                  onError={() => setFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-forest-200">
                  <Bug className="h-14 w-14" aria-hidden="true" />
                  <span className="text-sm font-medium uppercase tracking-wider text-forest-200/80">
                    Specimen photo coming soon
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-forest-800 px-6 py-3">
              <p className="font-serif text-sm text-cream-50">
                {insect.common_name} · <em>{insect.scientific_name}</em>
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-cream-200/80">
                {insect.taxonomic_orders?.name ?? 'Order'} ·{' '}
                {insect.taxonomic_families?.name ?? 'Family'}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About this species</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-ink-600">{insect.description}</p>
              {insect.identification_characteristics && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                    Identification characteristics
                  </p>
                  <p className="text-ink-600">{insect.identification_characteristics}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {insect.life_cycles && insect.life_cycles.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Life cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {[...insect.life_cycles]
                    .sort((a, b) => a.stage_order - b.stage_order)
                    .map((stage, index) => (
                      <li key={stage.id} className="relative flex gap-4">
                        {index < insect.life_cycles!.length - 1 && (
                          <span className="absolute left-4 top-10 h-full w-px bg-forest-100" aria-hidden="true" />
                        )}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 font-serif text-xs font-semibold text-forest-800">
                          {stage.stage_order}
                        </span>
                        <div className="pb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="capitalize font-serif text-base font-semibold text-forest-900">
                              {stage.stage_name}
                            </h3>
                            {stage.duration && (
                              <Badge tone="cream">{stage.duration}</Badge>
                            )}
                          </div>
                          {stage.appearance && (
                            <p className="mt-1 text-sm text-ink-500">{stage.appearance}</p>
                          )}
                          {stage.feeding_behavior && (
                            <p className="mt-1 text-sm text-ink-500">
                              <span className="font-medium text-ink-600">Feeding: </span>
                              {stage.feeding_behavior}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {(insect.insect_damage_symptoms?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Damage symptoms</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insect.insect_damage_symptoms?.map((entry) => (
                    <li key={entry.symptom_id} className="flex items-start gap-3">
                      <Bug className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink-600">
                            {entry.damage_symptoms?.name ?? 'Symptom'}
                          </span>
                          {entry.severity && (
                            <Badge tone={severityTone[entry.severity] ?? 'neutral'}>
                              {entry.severity}
                            </Badge>
                          )}
                        </div>
                        {entry.description && (
                          <p className="mt-0.5 text-sm text-ink-500">{entry.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(insect.insect_management?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Management & IPM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {insect.insect_management?.map((entry) => (
                    <div
                      key={entry.method_id}
                      className="rounded-lg border border-forest-100 bg-cream-50/60 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Tractor className="h-4 w-4 text-forest-700" aria-hidden="true" />
                        <span className="font-medium text-ink-600">
                          {entry.management_methods?.name ?? 'Method'}
                        </span>
                      </div>
                      {entry.management_methods?.category && (
                        <Badge tone="neutral" className="mt-2">
                          {entry.management_methods.category}
                        </Badge>
                      )}
                      {entry.notes && (
                        <p className="mt-2 text-sm text-ink-500">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(insect.natural_enemy_relationships?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Natural enemies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insect.natural_enemy_relationships?.map((enemy, index) => {
                    const enemyInsect = enemy.insects
                    return (
                      <li
                        key={`${enemy.enemy_insect_id}-${index}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-forest-100 px-4 py-3"
                      >
                        <Badge tone="neutral">{enemy.relationship ?? 'associate'}</Badge>
                        {enemyInsect?.id ? (
                          <Link
                            to={`/museum/${enemyInsect.id}`}
                            className="font-medium text-forest-700 hover:text-forest-900"
                          >
                            {enemyInsect.common_name}{' '}
                            <span className="font-normal italic text-ink-400">
                              {enemyInsect.scientific_name}
                            </span>
                          </Link>
                        ) : (
                          <span className="font-medium text-ink-600">
                            {enemyInsect?.common_name ?? 'Unknown'}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {user && (
            <Button
              variant={favorited ? 'primary' : 'secondary'}
              fullWidth
              onClick={handleToggleFavorite}
              disabled={favoriteBusy}
            >
              <Star className={cn('h-4 w-4', favorited && 'fill-current')} aria-hidden="true" />
              {favorited ? 'Saved to favorites' : 'Save to favorites'}
            </Button>
          )}
          <Link to={`/assistant?insect=${encodeURIComponent(insect.id)}`} className="block">
            <Button variant="secondary" fullWidth>
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Ask EntomoAI about this species
            </Button>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Taxonomy</CardTitle>
            </CardHeader>
            <CardContent>
              <TaxonomyRow
                label="Order"
                value={insect.taxonomic_orders?.name ?? insect.order_id}
                to={`/museum?order=${encodeURIComponent(insect.order_id)}`}
              />
              <TaxonomyRow
                label="Family"
                value={insect.taxonomic_families?.name ?? insect.family_id}
                to={`/museum?order=${encodeURIComponent(insect.order_id)}&family=${encodeURIComponent(insect.family_id)}`}
              />
              <TaxonomyRow
                label="Genus"
                value={insect.taxonomic_genera?.name ?? insect.genus_id}
              />
            </CardContent>
          </Card>

          {(insect.crop_insects?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Associated crops
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insect.crop_insects?.map((entry) => (
                  <div
                    key={entry.crop_id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-forest-100 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-ink-600">
                      <Leaf className="h-4 w-4 text-leaf-600" aria-hidden="true" />
                      {entry.crops?.name ?? 'Crop'}
                    </span>
                    <Badge tone={entry.relationship_type === 'pest' ? 'red' : 'leaf'}>
                      {entry.relationship_type}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(insect.insect_scientific_references?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  References
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insect.insect_scientific_references?.map((ref, index) => {
                    const reference = ref.scientific_references as Record<string, unknown> | null
                    if (!reference) return null
                    const year = reference.year as number | null | undefined
                    const authors = reference.authors as string[] | null | undefined
                    const authorsText =
                      authors && authors.length > 0
                        ? authors.length > 2
                          ? `${authors[0]} et al.`
                          : authors.join(' & ')
                        : 'Anonymous'
                    return (
                      <li key={`${ref.reference_id}-${index}`} className={cn('pl-3', index > 0 && 'border-l border-forest-100')}>
                        <p className="text-sm font-medium text-ink-600">
                          {reference.title as string}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {authorsText}
                          {year ? `, ${year}` : ''}
                          {reference.journal ? `, ${reference.journal as string}` : ''}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <p className="rounded-xl bg-cream-100/60 p-4 text-xs leading-relaxed text-ink-400">
            <CheckCircle2 className="mb-1 h-4 w-4 text-leaf-600" aria-hidden="true" />
            Species information is maintained by entomology editors and follows standard
            verification levels. Always confirm field identifications with a specialist.
          </p>
        </aside>
      </div>
    </div>
  )
}

function ButtonBack() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-forest-800 px-4 py-2 text-sm font-medium text-cream-50">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to museum
    </span>
  )
}