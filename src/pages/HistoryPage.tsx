import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bug, ChevronRight, History, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { deleteIdentification, fetchMyIdentifications } from '@/services/history'
import { useAuth } from '@/hooks/useAuth'
import { useImageUrl } from '@/hooks/useImageUrl'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/** Identification photos live in a private bucket, so they need a signed URL. */
function IdentificationThumb({ path }: { path: string | null | undefined }) {
  const url = useImageUrl(path, 'identification-images')
  if (!url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-forest-300">
        <Bug className="h-7 w-7" aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt="Identification input"
      className="h-16 w-16 shrink-0 rounded-lg border border-forest-100 object-cover"
    />
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['history', user?.id],
    queryFn: () => fetchMyIdentifications(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  const deleteMutation = useMutation({
    mutationFn: (identificationId: string) => deleteIdentification(user?.id ?? '', identificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  if (!user) return null

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to view history."
        />
      </div>
    )
  }

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Identification history</h1>
        <p className="mt-1 text-sm text-ink-400">
          Your past AI identifications, ranked candidates and evidence scores.
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No identifications yet"
          description="Identifications you run will appear here automatically."
          icon={<History className="h-10 w-10" aria-hidden="true" />}
          action={
            <Link to="/identify">
              <Button>Identify your first insect</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {query.data?.map((identification) => {
            const topCandidate = identification.candidates?.[0]
            return (
              <Card key={identification.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex gap-4 sm:flex-1">
                      <IdentificationThumb path={identification.image_path} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif font-semibold text-forest-900">
                            {topCandidate?.insects?.common_name ??
                              topCandidate?.insects?.scientific_name ??
                              'Identification'}
                          </span>
                          {topCandidate && (
                            <Badge tone={topCandidate.confidence >= 60 ? 'leaf' : 'neutral'}>
                              {Math.round(topCandidate.confidence)}%
                            </Badge>
                          )}
                          <Badge tone="cream">{formatDate(identification.created_at)}</Badge>
                        </div>
                        {identification.location_name && (
                          <p className="mt-1 text-xs text-ink-400">{identification.location_name}</p>
                        )}
                        {identification.result_summary && (
                          <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                            {identification.result_summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(identification.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                      {topCandidate?.insects && (
                        <Link to={`/museum/${topCandidate.insects.id}`} className="text-sm font-medium text-forest-700 hover:text-forest-900">
                          <span className="inline-flex items-center gap-1">
                            Species profile <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {identification.candidates && identification.candidates.length > 1 && (
                    <details className="mt-4 rounded-lg bg-cream-50/60 p-3">
                      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-ink-400">
                        All candidates ({identification.candidates.length})
                      </summary>
                      <ul className="mt-2 space-y-1.5">
                        {identification.candidates.map((candidate) => (
                          <li key={candidate.id} className="flex items-center justify-between text-sm">
                            <span className="text-ink-600">
                              {candidate.insects?.common_name ?? candidate.insects?.scientific_name ?? '—'}
                            </span>
                            <span className="text-xs text-ink-400">
                              {candidate.confidence_label ?? ''} {Math.round(candidate.confidence)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}