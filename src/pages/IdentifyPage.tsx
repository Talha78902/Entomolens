import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  CheckCircle2,
  Gauge,
  MapPin,
  ScanSearch,
  Sprout,
  Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageDropzone } from '@/components/identify/ImageDropzone'
import {
  compressImage,
  fetchAllInsectNames,
  fileToDataUrl,
  persistIdentification,
  runIdentification,
} from '@/services/identify'
import { fetchCrops, fetchSymptoms } from '@/services/knowledge'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { IdentificationResult } from '@/types/database'

const ANALYSIS_STEPS = [
  'Analyzing image…',
  'Analyzing morphology…',
  'Checking crop association…',
  'Checking symptoms…',
  'Generating candidates…',
]

type Stage = 'form' | 'analyzing' | 'result' | 'error'

export function IdentifyPage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const [stage, setStage] = useState<Stage>('form')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<IdentificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const cropsQuery = useQuery({ queryKey: ['crops', 'list'], queryFn: fetchCrops })
  const symptomsQuery = useQuery({ queryKey: ['symptoms', 'list'], queryFn: fetchSymptoms })

  const handleFileChange = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    setFile(next)
  }

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current)
    }
  }, [])

  const toggleSymptom = (id: string) => {
    setSymptoms((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    )
  }

  const startAnalysis = async () => {
    const hasContext = Boolean(crop || location || notes || symptoms.length > 0)
    if (!file && !hasContext) {
      setError('Add a photo, or fill in at least one of crop, symptoms, location or notes.')
      return
    }
    setStage('analyzing')
    setError(null)
    setResult(null)
    setSavedId(null)
    setStepIndex(0)
    stepTimer.current = setInterval(() => {
      setStepIndex((index) => Math.min(ANALYSIS_STEPS.length - 1, index + 1))
    }, 1100)

    try {
      const imageDataUrl = file ? await compressImage(await fileToDataUrl(file)) : undefined
      const context = {
        crop: crop || undefined,
        symptoms: symptoms.map((id) => {
          const name = symptomsQuery.data?.find((s) => s.id === id)?.name
          return name ?? id
        }),
        location: location || undefined,
        notes: notes || undefined,
      }
      const identificationResult = await runIdentification({ imageDataUrl, context })

      const names = await fetchAllInsectNames()
      const matchedIds: Record<number, string> = {}
      for (const candidate of identificationResult.candidates) {
        const match = names.find(
          (insect) =>
            insect.scientific_name.toLowerCase() === candidate.scientificName.toLowerCase() ||
            insect.common_name.toLowerCase() === candidate.commonName.toLowerCase(),
        )
        if (match) matchedIds[candidate.rank] = match.id
      }
      for (const candidate of identificationResult.candidates) {
        candidate.insectId = matchedIds[candidate.rank]
      }

      setResult(identificationResult)
      if (user) {
        const id = await persistIdentification({ result: identificationResult, imageDataUrl, context })
        if (id) setSavedId(id)
      }
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed. Please try again.')
      setStage('error')
    } finally {
      if (stepTimer.current) {
        clearInterval(stepTimer.current)
        stepTimer.current = null
      }
    }
  }

  const reset = () => {
    setStage('form')
    setResult(null)
    setError(null)
    setSavedId(null)
    setFile(null)
    setCrop('')
    setSymptoms([])
    setLocation('')
    setNotes('')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use EntomoLens."
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-2xl">
        <Badge tone="leaf" className="mb-3">
          AI Identification
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Identify an insect</h1>
        <p className="mt-2 text-ink-400">
          Combine a photo with crop, symptom and location context for a transparent,
          evidence-based result. Confidence is reported as a model score — never a false certainty.
        </p>
      </header>

      {stage === 'form' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Specimen photo</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageDropzone
                  value={file}
                  previewUrl={previewUrl}
                  onChange={handleFileChange}
                  onError={setError}
                />
                <p className="mt-2 text-xs text-ink-400">
                  A photo on its own is enough. Crop, symptoms and location are entirely optional
                  and only sharpen the result.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    Crop
                  </span>
                  <select
                    value={crop}
                    onChange={(event) => setCrop(event.target.value)}
                    className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                  >
                    <option value="">Not sure / other</option>
                    {cropsQuery.data?.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    Observed symptoms
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {symptomsQuery.data?.slice(0, 12).map((symptom) => {
                      const active = symptoms.includes(symptom.id)
                      return (
                        <button
                          key={symptom.id}
                          type="button"
                          onClick={() => toggleSymptom(symptom.id)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            active
                              ? 'border-forest-800 bg-forest-800 text-cream-50'
                              : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                          )}
                          aria-pressed={active}
                        >
                          {symptom.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    Location / region
                  </span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="e.g. Punjab, Pakistan"
                      className="h-10 w-full rounded-lg border border-forest-200 bg-white pl-9 pr-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    Notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Stage, behaviour, how the damage started, how it spread…"
                    className="w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                  />
                </label>
              </CardContent>
            </Card>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <Button size="lg" fullWidth onClick={startAnalysis}>
              <ScanSearch className="h-5 w-5" aria-hidden="true" />
              Identify
            </Button>
          </div>
        </div>
      )}

      {stage === 'analyzing' && (
        <Card className="mx-auto mt-10 max-w-lg">
          <CardContent className="flex flex-col items-center gap-5 p-8">
            <Spinner size="lg" />
            <div className="w-full space-y-2">
              {ANALYSIS_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={cn(
                    'flex items-center gap-2 text-sm transition-colors',
                    index < stepIndex && 'text-forest-700',
                    index === stepIndex && 'font-medium text-forest-900',
                    index > stepIndex && 'text-ink-300',
                  )}
                >
                  {index < stepIndex ? (
                    <CheckCircle2 className="h-4 w-4 text-leaf-600" aria-hidden="true" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-current" aria-hidden="true" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'error' && (
        <Card className="mx-auto mt-10 max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <h2 className="font-serif text-xl font-semibold text-red-700">Analysis failed</h2>
            <p className="text-sm text-ink-500">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => setStage('form')}>Try again</Button>
              <Link to="/museum">
                <Button variant="secondary">Browse museum instead</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'result' && result && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-leaf-600" aria-hidden="true" />
              <h2 className="font-serif text-xl font-semibold text-forest-900">
                Likely identification
              </h2>
            </div>
            {savedId && (
              <Badge tone="leaf">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Saved to your history
              </Badge>
            )}
          </div>

          {result.visionUnavailable && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Image could not be analyzed</p>
              <p className="mt-1 text-amber-800">
                No vision-capable AI model is available on this deployment, so your result is based on
                the context you provided (crop, symptoms, location). Confidence is intentionally low.
              </p>
            </div>
          )}

          {result.candidates[0] && (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-forest-900">
                      {result.candidates[0].commonName || 'Unidentified'}
                    </h3>
                    {result.candidates[0].scientificName && (
                      <p className="mt-0.5 text-base italic text-ink-400">
                        {result.candidates[0].scientificName}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={result.candidates[0].confidenceLabel === 'High' ? 'leaf' : result.candidates[0].confidenceLabel === 'Moderate' ? 'amber' : 'neutral'}>
                        Model confidence: {result.candidates[0].confidenceLabel}{' '}
                        ({Math.round(result.candidates[0].confidence)})
                      </Badge>
                      {result.candidates[0].insectId && (
                        <Link to={`/museum/${result.candidates[0].insectId}`}>
                          <Badge tone="forest" className="cursor-pointer">
                            View species profile
                          </Badge>
                        </Link>
                      )}
                    </div>
                    {result.candidates[0].reasoning && (
                      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500">
                        {result.candidates[0].reasoning}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* EntomoScore */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                EntomoScore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ScoreBar label="Image evidence" value={result.entomoScore.image} />
                <ScoreBar label="Crop association" value={result.entomoScore.crop} />
                <ScoreBar label="Symptom match" value={result.entomoScore.symptom} />
                <ScoreBar label="User observations" value={result.entomoScore.observation} />
                <div className="border-t border-forest-100 pt-3">
                  <ScoreBar label="Overall evidence" value={result.entomoScore.overall} prominent />
                </div>
              </div>
              <p className="mt-4 text-xs text-ink-400">
                EntomoScore summarizes available evidence and is not a scientifically validated
                probability of species identity.
              </p>
            </CardContent>
          </Card>

          {/* Candidates */}
          <Card>
            <CardHeader>
              <CardTitle>All candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {result.candidates.map((candidate) => (
                  <li key={candidate.rank} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 font-serif text-sm font-semibold text-forest-800">
                      {candidate.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="truncate font-medium text-ink-600">
                          {candidate.commonName} {candidate.scientificName && <em className="font-normal text-ink-400">{candidate.scientificName}</em>}
                        </span>
                        <span className="text-sm font-semibold text-forest-800">
                          {Math.round(candidate.confidence)}
                          <span className="font-normal text-ink-400">%</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-200">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            candidate.confidence >= 80 ? 'bg-leaf-500' : candidate.confidence >= 60 ? 'bg-amber-400' : 'bg-ink-300',
                          )}
                          style={{ width: `${candidate.confidence}%` }}
                        />
                      </div>
                      {candidate.reasoning && (
                        <p className="mt-1 text-xs text-ink-400">{candidate.reasoning}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-xl bg-cream-100/60 p-4 text-xs leading-relaxed text-ink-400">
                <Stethoscope className="mb-1 h-4 w-4 text-forest-700" aria-hidden="true" />
                {result.disclaimer}
              </p>
            </CardContent>
          </Card>

          {result.summary && (
            <p className="max-w-3xl text-sm leading-relaxed text-ink-500">{result.summary}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>Identify another</Button>
            <Link to="/history">
              <Button variant="secondary">View identification history</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, value, prominent = false }: { label: string; value: number; prominent?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className={cn('text-ink-500', prominent && 'font-medium text-forest-900')}>{label}</span>
        <span className={cn('font-semibold', prominent ? 'text-forest-900' : 'text-ink-600')}>{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className={cn('h-full rounded-full', prominent ? 'bg-forest-800' : 'bg-leaf-500')}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}