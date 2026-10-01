import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, EyeOff, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  deleteObservationAdmin,
  fetchAdminObservations,
  setObservationModerationStatus,
} from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

type Status = 'pending' | 'approved' | 'rejected'

const STATUS_TONE: Record<Status, 'amber' | 'leaf' | 'red'> = {
  pending: 'amber',
  approved: 'leaf',
  rejected: 'red',
}

export function ModerateObservationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | Status>('pending')
  const [query, setQuery] = useState('')

  const observationsQuery = useQuery({
    queryKey: ['admin', 'observations'],
    queryFn: fetchAdminObservations,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'observations'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const moderationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      setObservationModerationStatus(id, status),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteObservationAdmin(id),
    onSuccess: invalidate,
  })

  const rows = useMemo(() => {
    const list = observationsQuery.data ?? []
    const statusFiltered = filter === 'all' ? list : list.filter((row) => row.moderation_status === filter)
    const term = query.trim().toLowerCase()
    if (!term) return statusFiltered
    return statusFiltered.filter((row) => {
      const insects = row.insects as { common_name?: string } | null | undefined
      const crops = row.crops as { name?: string } | null | undefined
      const profiles = row.profiles as { full_name?: string } | null | undefined
      return [insects?.common_name, crops?.name, profiles?.full_name, row.location_name]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [observationsQuery.data, filter, query])

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to moderate observations." />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-xl font-semibold text-forest-900">Moderate observations</h1>
        <p className="mt-0.5 text-sm text-ink-400">
          Only approved public observations appear on the community map.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                filter === status
                  ? 'border-forest-800 bg-forest-800 text-cream-50'
                  : 'border-forest-200 bg-white text-forest-800 hover:bg-cream-50',
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="h-10 w-full rounded-lg border border-forest-200 bg-white pl-9 pr-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
          />
        </div>
      </div>

      {observationsQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing to moderate" description="No observations match this view." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const insects = row.insects as { common_name?: string } | null | undefined
            const crops = row.crops as { name?: string } | null | undefined
            const profiles = row.profiles as { full_name?: string } | null | undefined
            const status = (row.moderation_status as Status) ?? 'pending'
            return (
              <Card key={String(row.id)}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/museum/${String(row.insect_id ?? '')}`}
                        className="font-serif font-semibold text-forest-900 hover:underline"
                      >
                        {insects?.common_name ?? 'Unknown species'}
                      </Link>
                      <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                      {(row.visibility as string) === 'public' ? (
                        <Badge tone="neutral">public</Badge>
                      ) : (
                        <Badge tone="neutral">
                          <EyeOff className="h-3 w-3" aria-hidden="true" /> private
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {String(row.observed_on ?? '')} · {profiles?.full_name ?? 'Unknown user'} ·{' '}
                      {String(row.location_name ?? '')}
                      {crops?.name ? ` · ${crops.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status !== 'approved' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => moderationMutation.mutate({ id: String(row.id), status: 'approved' })}
                        disabled={moderationMutation.isPending}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" /> Approve
                      </Button>
                    )}
                    {status !== 'rejected' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => moderationMutation.mutate({ id: String(row.id), status: 'rejected' })}
                        disabled={moderationMutation.isPending}
                      >
                        <X className="h-4 w-4" aria-hidden="true" /> Reject
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (window.confirm('Delete this observation permanently?')) {
                          deleteMutation.mutate(String(row.id))
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
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