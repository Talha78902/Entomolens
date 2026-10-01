import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, LayoutGrid, Link2, Plus, Table2, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  addObservationToProject,
  fetchProject,
  projectStatusLabel,
  removeObservationFromProject,
  exportObservationsCsv,
} from '@/services/research'
import { fetchMyObservations, observationImageUrl, type ObservationRow } from '@/services/observations'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured, tryGetSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

export function ResearchProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<'cards' | 'table'>('cards')

  const projectQuery = useQuery({
    queryKey: ['research-projects', user?.id, projectId],
    queryFn: () => fetchProject(user?.id ?? '', projectId ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured && Boolean(projectId),
  })
  const myObservationsQuery = useQuery({
    queryKey: ['observations', user?.id, 'link-candidates'],
    queryFn: () => fetchMyObservations(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured && adding,
  })

  const linkedObservationsQuery = useQuery({
    queryKey: ['research-project-observations', projectId],
    queryFn: async () => {
      if (!projectQuery.data) return []
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const ids = (projectQuery.data.observations ?? []).map((link) => link.observation_id)
      if (ids.length === 0) return []
      const { data } = await supabase
        .from('observations')
        .select('*, insects(common_name, scientific_name, is_pest, is_beneficial), crops(name)')
        .in('id', ids)
      return (data ?? []) as ObservationRow[]
    },
    enabled: Boolean(projectQuery.data) && isSupabaseConfigured,
  })

  const addMutation = useMutation({
    mutationFn: (observationId: string) =>
      addObservationToProject(user?.id ?? '', projectId ?? '', observationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] })
      queryClient.invalidateQueries({ queryKey: ['research-project-observations'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (observationId: string) =>
      removeObservationFromProject(projectId ?? '', observationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] })
      queryClient.invalidateQueries({ queryKey: ['research-project-observations'] })
    },
  })

  const unlinkedObservations = useMemo(() => {
    const linked = new Set((projectQuery.data?.observations ?? []).map((link) => link.observation_id))
    return (myObservationsQuery.data ?? []).filter((observation) => !linked.has(observation.id))
  }, [myObservationsQuery.data, projectQuery.data])

  const project = projectQuery.data
  const linked = linkedObservationsQuery.data ?? []

  if (!user) return null

  if (projectQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to manage research projects."
        />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Project not found"
          description="This project does not exist or is not yours."
          action={
            <Link to="/research">
              <Button variant="secondary">Back to projects</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-[60vh]">
      <Link
        to="/research"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Badge tone={project.status === 'active' ? 'leaf' : project.status === 'archived' ? 'red' : 'amber'}>
              {projectStatusLabel(project.status)}
            </Badge>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-forest-900">{project.title}</h1>
          {project.description && <p className="mt-1 text-sm text-ink-400">{project.description}</p>}
          <p className="mt-2 text-xs text-ink-400">
            {project.start_date.slice(0, 10)}
            {project.end_date ? ` → ${project.end_date.slice(0, 10)}` : ' · open-ended'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-forest-200 bg-white p-1">
            <button
              onClick={() => setView('cards')}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                view === 'cards' ? 'bg-forest-800 text-cream-50' : 'text-ink-400 hover:text-forest-800',
              )}
              aria-label="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> Cards
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                view === 'table' ? 'bg-forest-800 text-cream-50' : 'text-ink-400 hover:text-forest-800',
              )}
              aria-label="Table view"
            >
              <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> Table
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={() => exportObservationsCsv(linked)}
            disabled={linked.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV ({linked.length})
          </Button>
          <Button onClick={() => setAdding((current) => !current)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Link observations
          </Button>
        </div>
      </header>

      {adding && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-forest-900">Link a field observation</p>
              <button
                onClick={() => setAdding(false)}
                className="rounded p-1 text-ink-400 hover:bg-forest-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {myObservationsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : unlinkedObservations.length === 0 ? (
              <p className="text-sm text-ink-400">
                No unlinked observations. Create one in{' '}
                <Link to="/observations" className="text-leaf-700 underline">
                  Field observations
                </Link>
                .
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {unlinkedObservations.map((observation) => (
                  <div
                    key={observation.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-forest-100 bg-cream-50/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-forest-900">
                        {observation.insects?.common_name ?? 'Unknown'} · {observation.observed_on.slice(0, 10)}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {observation.location_name ?? observation.insects?.scientific_name ?? ''}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addMutation.mutate(observation.id)}
                      disabled={addMutation.isPending}
                    >
                      <Link2 className="h-4 w-4" aria-hidden="true" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {linkedObservationsQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : linked.length === 0 ? (
        <EmptyState
          title="No linked observations"
          description="Link field observations to build your project dataset."
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Link observations
            </Button>
          }
        />
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-forest-100 bg-white shadow-card">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-forest-100 text-[10px] uppercase tracking-[0.18em] text-ink-400">
                <th className="px-4 py-3 font-semibold">Photo</th>
                <th className="px-4 py-3 font-semibold">Species</th>
                <th className="px-4 py-3 font-semibold">Crop</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">Damage</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {[...linked]
                .sort((a, b) => (b.observed_on ?? '').localeCompare(a.observed_on ?? ''))
                .map((observation) => {
                  const imageUrl = observationImageUrl(observation.image_path)
                  return (
                    <tr key={observation.id} className="border-b border-forest-100/70 last:border-0">
                      <td className="px-4 py-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-11 w-11 rounded-lg border border-forest-100 object-cover"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-lg bg-cream-100" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/museum/${observation.insect_id}`}
                          className="font-medium text-forest-900 hover:underline"
                        >
                          {observation.insects?.common_name ?? 'Unknown'}
                        </Link>
                        <p className="text-xs italic text-ink-400">
                          {observation.insects?.scientific_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{observation.crops?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-500">{observation.location_name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                        {observation.observed_on.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-500">
                        {observation.life_stage ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-500">
                        {observation.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-500">
                        {observation.damage_level != null ? `${observation.damage_level}/10` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => removeMutation.mutate(observation.id)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                        </Button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {[...linked]
            .sort((a, b) => (b.observed_on ?? '').localeCompare(a.observed_on ?? ''))
            .map((observation) => {
              const imageUrl = observationImageUrl(observation.image_path)
              return (
                <Card key={observation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg border border-forest-100 object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-cream-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/museum/${observation.insect_id}`}
                            className="font-serif font-semibold text-forest-900 hover:underline"
                          >
                            {observation.insects?.common_name ?? 'Unknown species'}
                          </Link>
                          {observation.insects?.is_pest && <Badge tone="red">pest</Badge>}
                          {observation.insects?.is_beneficial && <Badge tone="leaf">beneficial</Badge>}
                          {observation.crops?.name && (
                            <Badge tone="neutral">{observation.crops.name}</Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-ink-400">
                          <span>{observation.observed_on.slice(0, 10)}</span>
                          {observation.location_name && <span>{observation.location_name}</span>}
                          {observation.life_stage && <span>{observation.life_stage}</span>}
                          {observation.quantity != null && <span>”{observation.quantity}</span>}
                          {observation.damage_level != null && (
                            <span>damage {observation.damage_level}/10</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => removeMutation.mutate(observation.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}