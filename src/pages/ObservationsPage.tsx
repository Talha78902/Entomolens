import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageDropzone } from '@/components/identify/ImageDropzone'
import {
  createObservation,
  deleteObservation,
  fetchMyObservations,
  observationImageUrl,
  updateObservation,
  type ObservationRow,
} from '@/services/observations'
import { fetchCrops } from '@/services/knowledge'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured, tryGetSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const LIFE_STAGES = ['egg', 'larva', 'nymph', 'pupa', 'adult', 'other']

interface FormState {
  insect_id: string
  crop_id: string
  location_name: string
  observed_on: string
  life_stage: string
  quantity: string
  damage_level: number
  notes: string
  visibility: 'private' | 'public'
  image: File | null
}

const emptyForm = (): FormState => ({
  insect_id: '',
  crop_id: '',
  location_name: '',
  observed_on: new Date().toISOString().slice(0, 10),
  life_stage: '',
  quantity: '',
  damage_level: 0,
  notes: '',
  visibility: 'private',
  image: null,
})

export function ObservationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const observationsQuery = useQuery({
    queryKey: ['observations', user?.id],
    queryFn: () => fetchMyObservations(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  const insectsQuery = useQuery({
    queryKey: ['insects-names'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data } = await supabase
        .from('insects')
        .select('id, common_name, scientific_name, is_pest, is_beneficial')
        .order('common_name')
      return (data ?? []) as Array<{ id: string; common_name: string; scientific_name: string; is_pest: boolean; is_beneficial: boolean }>
    },
    enabled: isSupabaseConfigured,
  })
  const cropsQuery = useQuery({ queryKey: ['crops', 'list'], queryFn: fetchCrops })

  const selectedInsect = useMemo(
    () => insectsQuery.data?.find((insect) => insect.id === form.insect_id),
    [insectsQuery.data, form.insect_id],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return
      const payload = {
        insect_id: form.insect_id,
        crop_id: form.crop_id || null,
        location_name: form.location_name || null,
        latitude: null,
        longitude: null,
        observed_on: form.observed_on,
        image: form.image,
        life_stage: form.life_stage || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        damage_level: form.damage_level,
        notes: form.notes || null,
        visibility: form.visibility,
      }
      if (editingId) {
        return updateObservation(user.id, editingId, payload)
      }
      return Boolean(await createObservation(payload))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteObservation(user?.id ?? '', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
    },
  })

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const startEdit = (observation: ObservationRow) => {
    setEditingId(observation.id)
    setForm({
      insect_id: observation.insect_id,
      crop_id: observation.crop_id ?? '',
      location_name: observation.location_name ?? '',
      observed_on: observation.observed_on.slice(0, 10),
      life_stage: observation.life_stage ?? '',
      quantity: observation.quantity != null ? String(observation.quantity) : '',
      damage_level: observation.damage_level ?? 0,
      notes: observation.notes ?? '',
      visibility: observation.visibility,
      image: null,
    })
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageChange = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    setForm((current) => ({ ...current, image: next }))
  }

  /* eslint-disable react/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!editId) return
    const observation = observationsQuery.data?.find((item) => item.id === editId)
    if (observation) {
      startEdit(observation)
      setSearchParams({}, { replace: true })
    }
  }, [editId, observationsQuery.data])
  /* eslint-enable react/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!user) return null

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to record observations."
        />
      </div>
    )
  }

  const observations = observationsQuery.data ?? []

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-forest-900">Field observations</h1>
          <p className="mt-1 text-sm text-ink-400">
            Record species encounters in the field. Private by default — publish only what you want
            shared.
          </p>
        </div>
        <Link to="/map">
          <Button variant="secondary">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Open public map
          </Button>
        </Link>
      </header>

      {/* Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Pencil className="h-5 w-5 text-leaf-600" aria-hidden="true" /> : <Plus className="h-5 w-5 text-leaf-600" aria-hidden="true" />}
            {editingId ? 'Edit observation' : 'New observation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Species *
              </span>
              <select
                value={form.insect_id}
                onChange={(event) => setForm({ ...form, insect_id: event.target.value })}
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              >
                <option value="">Select a species</option>
                {insectsQuery.data?.map((insect) => (
                  <option key={insect.id} value={insect.id}>
                    {insect.common_name} — {insect.scientific_name}
                  </option>
                ))}
              </select>
              {selectedInsect && (
                <div className="mt-1.5 flex gap-1.5">
                  {selectedInsect.is_pest && <Badge tone="red">pest</Badge>}
                  {selectedInsect.is_beneficial && <Badge tone="leaf">beneficial</Badge>}
                </div>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Crop
              </span>
              <select
                value={form.crop_id}
                onChange={(event) => setForm({ ...form, crop_id: event.target.value })}
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              >
                <option value="">None</option>
                {cropsQuery.data?.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Location
              </span>
              <input
                value={form.location_name}
                onChange={(event) => setForm({ ...form, location_name: event.target.value })}
                placeholder="e.g. Faisalabad district"
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Date *
              </span>
              <input
                type="date"
                value={form.observed_on}
                onChange={(event) => setForm({ ...form, observed_on: event.target.value })}
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Life stage
              </span>
              <select
                value={form.life_stage}
                onChange={(event) => setForm({ ...form, life_stage: event.target.value })}
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              >
                <option value="">Any</option>
                {LIFE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Quantity
              </span>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                placeholder="e.g. 25"
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              />
            </label>

            <div className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Damage level: {form.damage_level}/10
              </span>
              <input
                type="range"
                min={0}
                max={10}
                value={form.damage_level}
                onChange={(event) => setForm({ ...form, damage_level: Number(event.target.value) })}
                className="w-full accent-forest-800"
              />
            </div>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Notes
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                placeholder="Behaviour, host condition, surrounding habitat…"
                className="w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              />
            </label>

            <div className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Photos
              </span>
              <ImageDropzone value={form.image} previewUrl={previewUrl} onChange={handleImageChange} className="max-w-md" />
            </div>

            <div className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Visibility
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: 'private' })}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    form.visibility === 'private'
                      ? 'border-forest-800 bg-forest-800 text-cream-50'
                      : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                  )}
                >
                  <EyeOff className="h-4 w-4" aria-hidden="true" /> Private (default)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: 'public' })}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    form.visibility === 'public'
                      ? 'border-forest-800 bg-forest-800 text-cream-50'
                      : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                  )}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" /> Public
                </button>
              </div>
              {form.visibility === 'public' && (
                <p className="mt-1.5 text-xs text-ink-400">
                  Public observations appear on the community map without precise coordinates.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.insect_id || !form.observed_on || saveMutation.isPending}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {editingId ? 'Save changes' : 'Save observation'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {observationsQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : observations.length === 0 ? (
        <EmptyState
          title="No observations yet"
          description="Add your first field record above."
        />
      ) : (
        <div className="space-y-4">
          {observations.map((observation) => {
            const imageUrl = observationImageUrl(observation.image_path)
            return (
              <Card key={observation.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Observation"
                        className="h-20 w-20 shrink-0 rounded-lg border border-forest-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-forest-300">
                        <ImagePlus className="h-8 w-8" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold text-forest-900">
                          {observation.insects?.common_name ?? 'Unknown species'}
                        </h3>
                        {observation.insects?.is_pest && <Badge tone="red">pest</Badge>}
                        {observation.insects?.is_beneficial && <Badge tone="leaf">beneficial</Badge>}
                        <Badge tone={observation.visibility === 'public' ? 'leaf' : 'neutral'}>
                          {observation.visibility === 'public' ? (
                            <Eye className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <EyeOff className="h-3 w-3" aria-hidden="true" />
                          )}
                          {observation.visibility}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm italic text-ink-400">
                        {observation.insects?.scientific_name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-400">
                        <span>{observation.observed_on?.slice(0, 10) ?? '—'}</span>
                        {observation.location_name && <span>{observation.location_name}</span>}
                        <span>Life stage: {observation.life_stage ?? '—'}</span>
                        {observation.quantity != null && <span>Count: {observation.quantity}</span>}
                        {observation.damage_level != null && (
                          <span>Damage: {observation.damage_level}/10</span>
                        )}
                      </div>
                      {observation.notes && (
                        <p className="mt-2 text-sm text-ink-500">{observation.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(observation)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(observation.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                      </Button>
                    </div>
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