import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Binoculars,
  Calendar,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Trash2,
  Wheat,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  deleteObservation,
  fetchObservationById,
  observationImageUrl,
} from '@/services/observations'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export function ObservationDetailPage() {
  const { observationId = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const observationQuery = useQuery({
    queryKey: ['observations', user?.id, observationId],
    queryFn: () => fetchObservationById(user?.id ?? '', observationId),
    enabled: Boolean(user) && isSupabaseConfigured && Boolean(observationId),
  })

  const removeMutation = useMutation({
    mutationFn: () => deleteObservation(user?.id ?? '', observationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      navigate('/observations')
    },
  })

  if (observationQuery.isLoading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const observation = observationQuery.data

  if (!observation) {
    return (
      <EmptyState
        className="mt-10"
        title="Observation not found"
        description="It may have been deleted, or it belongs to another account."
        icon={<Binoculars className="h-10 w-10" aria-hidden="true" />}
        action={
          <Link to="/observations">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to observations
            </Button>
          </Link>
        }
      />
    )
  }

  const imageUrl = observationImageUrl(observation.image_path)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/observations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Field observations
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/observations?edit=' + observation.id)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </Button>
        </div>
      </div>

      <header className="overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-card">
        {imageUrl ? (
          <img src={imageUrl} alt="Observation specimen" className="h-64 w-full object-cover sm:h-80" />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-forest-100 sm:h-80">
            <Binoculars className="h-16 w-16 text-forest-500" aria-hidden="true" />
          </div>
        )}
        <div className="flex flex-col gap-2 bg-forest-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-2xl font-semibold text-cream-50">
            {observation.insects?.common_name ?? 'Unknown species'}
          </h1>
          <p className="text-sm italic text-cream-50/70">{observation.insects?.scientific_name}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {observation.insects?.is_pest && <Badge tone="red">Pest</Badge>}
        {observation.insects?.is_beneficial && <Badge tone="leaf">Beneficial</Badge>}
        <Badge tone={observation.visibility === 'public' ? 'leaf' : 'neutral'}>
          {observation.visibility === 'public' ? (
            <Eye className="h-3 w-3" aria-hidden="true" />
          ) : (
            <EyeOff className="h-3 w-3" aria-hidden="true" />
          )}
          {observation.visibility}
        </Badge>
        {observation.moderation_status && observation.moderation_status !== 'approved' && (
          <Badge tone="amber" className="capitalize">
            {observation.moderation_status}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={Calendar} label="Observed on" value={new Date(observation.observed_on).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
        <Fact icon={MapPin} label="Location" value={observation.location_name ?? '—'} />
        <Fact icon={Binoculars} label="Life stage" value={observation.life_stage ?? '—'} />
        <Fact icon={Wheat} label="Crop" value={observation.crops?.name ?? '—'} />
        <Fact label="Quantity" value={observation.quantity != null ? String(observation.quantity) : '—'} />
        <Fact label="Damage level" value={observation.damage_level != null ? `${observation.damage_level}/10` : '—'} />
      </div>

      {observation.notes && (
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold text-forest-900">Field notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{observation.notes}</p>
        </Card>
      )}

      {observation.insects && (
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold text-forest-900">Species profile</h2>
          <p className="mt-2 text-sm text-ink-400">
            View the full museum record for{' '}
            <span className="italic">{observation.insects.scientific_name}</span>.
          </p>
          <Link to={`/museum/${observation.insect_id}`}>
            <Button variant="secondary" className="mt-4">
              Open specimen record <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-forest-100 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-leaf-700">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-forest-900">{value}</p>
    </div>
  )
}