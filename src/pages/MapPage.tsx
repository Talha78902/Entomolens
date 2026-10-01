import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Bug, ClipboardPaste, Leaf, LocateFixed, MapPin, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchPublicObservations } from '@/services/observations'
import { fetchCrops } from '@/services/knowledge'
import { tryGetSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const CENTER: [number, number] = [30.35, 69.35]
const ZOOM = 6

const COORD_PATTERN =
  /(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/

/** Returns a valid [lat, lng] pair or null if the text holds no usable coordinates. */
function parseCoordinates(raw: string): [number, number] | null {
  const text = raw.trim()
  if (!text) return null

  const direct = text.match(COORD_PATTERN)
  // Also accept geo: URIs and DMS-ish suffixes that follow the numeric pair.
  const candidate = direct ?? text.match(/geo:([-\d.,]+)/)?.[1]?.match(COORD_PATTERN)

  if (!candidate) return null
  const lat = Number(candidate[1])
  const lng = Number(candidate[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}

function makeIcon(isPest: boolean) {
  const color = isPest ? '#C0392B' : '#4F7D4A'
  return L.divIcon({
    className: 'entomolens-marker',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 20],
    popupAnchor: [0, -18],
  })
}

const PIN_ICON = L.divIcon({
  className: 'entomolens-pinned',
  html: `<div style="width:24px;height:24px;border-radius:50% 50% 0;transform:rotate(-45deg);background:#1D4ED8;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.45);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 22],
  popupAnchor: [0, -20],
})

export function MapPage() {
  const [species, setSpecies] = useState('')
  const [crop, setCrop] = useState('')
  const [type, setType] = useState<'all' | 'pest' | 'beneficial'>('all')
  const [location, setLocation] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [pinned, setPinned] = useState<[number, number] | null>(null)
  const [coordError, setCoordError] = useState<string | null>(null)
  const [manualCoords, setManualCoords] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  const applyCoordinates = (raw: string) => {
    const parsed = parseCoordinates(raw)
    if (!parsed) {
      setCoordError('No valid coordinates found. Use "latitude, longitude" (e.g. 30.35, 69.35).')
      setShowManualInput(true)
      return false
    }
    setPinned(parsed)
    setCoordError(null)
    return true
  }

  const importCoordinates = async () => {
    if (!navigator.clipboard?.readText) {
      setCoordError(
        'Clipboard access is not available in this browser. Paste the coordinates below instead.',
      )
      setShowManualInput(true)
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      if (!applyCoordinates(text)) setShowManualInput(true)
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setCoordError(
        denied
          ? 'Clipboard permission was denied. Paste the coordinates below instead.'
          : 'Could not read the clipboard. Paste the coordinates below instead.',
      )
      setShowManualInput(true)
    }
  }

  const insectsQuery = useQuery({
    queryKey: ['insects-names'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return []
      const { data } = await supabase
        .from('insects')
        .select('id, common_name, is_pest, is_beneficial')
        .order('common_name')
      return (data ?? []) as Array<{ id: string; common_name: string; is_pest: boolean; is_beneficial: boolean }>
    },
    enabled: isSupabaseConfigured,
  })
  const cropsQuery = useQuery({ queryKey: ['crops', 'list'], queryFn: fetchCrops })

  const query = useQuery({
    queryKey: ['observations', 'public', species, crop, type, debouncedLocation],
    queryFn: () =>
      fetchPublicObservations({
        species: species || undefined,
        crop: crop || undefined,
        type,
        location: debouncedLocation || undefined,
        limit: 800,
      }),
    enabled: isSupabaseConfigured,
  })

  const markers = useMemo(() => {
    const seen = new Set<string>()
    return (query.data ?? [])
      .filter((observation) => {
        const rounded = `${observation.latitude?.toFixed(2)},${observation.longitude?.toFixed(2)}`
        if (rounded === 'undefined,undefined') return false
        if (seen.has(rounded)) return false
        seen.add(rounded)
        return true
      })
      .slice(0, 250)
  }, [query.data])

  const applyLocation = () => setDebouncedLocation(location)

  return (
    <div className="min-h-[70vh]">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Observation map</h1>
        <p className="mt-1 text-sm text-ink-400">
          Community observations shared publicly. Coordinates are rounded for privacy.
        </p>
      </header>

      {/* Filters */}
      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-400">Species</span>
            <select
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
            >
              <option value="">All species</option>
              {insectsQuery.data?.map((insect) => (
                <option key={insect.id} value={insect.id}>
                  {insect.common_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-400">Crop</span>
            <select
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
            >
              <option value="">All crops</option>
              {cropsQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-400">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
            >
              <option value="all">Pests + beneficials</option>
              <option value="pest">Pests only</option>
              <option value="beneficial">Beneficials only</option>
            </select>
          </label>
          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-400">Location</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyLocation()
                  }}
                  placeholder="Filter by location"
                  className="h-10 w-full rounded-lg border border-forest-200 bg-white pl-9 pr-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                />
              </div>
            </label>
            <button
              onClick={applyLocation}
              className="mt-6 flex h-10 items-center justify-center rounded-lg bg-forest-800 px-3 text-cream-50 transition-colors hover:bg-forest-700"
              aria-label="Apply location filter"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => void importCoordinates()}
              className="mt-6 flex h-10 items-center justify-center gap-1.5 rounded-lg border border-forest-200 bg-white px-3 text-xs font-medium text-forest-800 transition-colors hover:bg-forest-50"
              aria-label="Import coordinates from clipboard"
              title="Paste coordinates (e.g. 30.35, 69.35) to center the map"
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Import coordinates</span>
            </button>
          </div>
        </div>
        {pinned && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
            <LocateFixed className="h-3.5 w-3.5 text-leaf-700" aria-hidden="true" />
            Centered on {pinned[0].toFixed(4)}, {pinned[1].toFixed(4)}.
            <button
              onClick={() => setPinned(null)}
              className="font-medium text-forest-700 underline-offset-2 hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {coordError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            {coordError}
          </div>
        )}

        {showManualInput && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block min-w-56 flex-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-400">
                Paste coordinates
              </span>
              <input
                value={manualCoords}
                onChange={(event) => setManualCoords(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyCoordinates(manualCoords)
                }}
                placeholder="30.35, 69.35"
                className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => {
                if (applyCoordinates(manualCoords)) setShowManualInput(false)
              }}
            >
              Use coordinates
            </Button>
          </div>
        )}
      </Card>

      {!isSupabaseConfigured ? (
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to view the map."
        />
      ) : query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-forest-100 shadow-card">
          <MapContainer
            key={pinned ? `pinned-${pinned[0]}-${pinned[1]}` : 'base'}
            center={pinned ?? CENTER}
            zoom={pinned ? 10 : ZOOM}
            scrollWheelZoom
            className="h-[70vh] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pinned && (
              <Marker position={pinned} icon={PIN_ICON}>
                <Popup>
                  <p className="text-sm font-medium text-forest-900">
                    Pinned location
                  </p>
                  <p className="text-xs text-ink-400">
                    {pinned[0].toFixed(4)}, {pinned[1].toFixed(4)}
                  </p>
                </Popup>
              </Marker>
            )}
            {markers.map((observation) => {
              const isPest = observation.insects?.is_pest ?? false
              return (
                <Marker
                  key={observation.id}
                  position={[
                    observation.latitude != null ? observation.latitude : 0,
                    observation.longitude != null ? observation.longitude : 0,
                  ]}
                  icon={makeIcon(isPest)}
                >
                  <Popup>
                    <div className="min-w-40">
                      <p className="font-serif font-semibold text-forest-900">
                        {observation.insects?.common_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs italic text-ink-400">
                        {observation.insects?.scientific_name ?? ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {observation.crops?.name && (
                          <Badge tone="neutral">
                            <Leaf className="h-3 w-3" aria-hidden="true" /> {observation.crops.name}
                          </Badge>
                        )}
                        <Badge tone={isPest ? 'red' : 'leaf'}>
                          {isPest ? 'Pest' : 'Beneficial'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-ink-400">
                        {observation.observed_on?.slice(0, 10) ?? ''}
                        {observation.location_name ? ` · ${observation.location_name}` : ''}
                      </p>
                      {observation.life_stage && (
                        <p className="mt-1 text-xs text-ink-400">Stage: {observation.life_stage}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      )}

      {query.data && (
        <p className={cn('mt-3 text-xs text-ink-400')}>
          Showing {markers.length} of {query.data.length} public observation
          {query.data.length === 1 ? '' : 's'} (deduplicated per ~100 m cell).
        </p>
      )}
    </div>
  )
}

export function MapLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-400">
      <span className="inline-flex items-center gap-1.5">
        <Bug className="h-3.5 w-3.5 text-red-600" aria-hidden="true" /> Pest
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Bug className="h-3.5 w-3.5 text-leaf-600" aria-hidden="true" /> Beneficial
      </span>
    </div>
  )
}