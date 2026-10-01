import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  ListChecks,
  ScanSearch,
  Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageDropzone } from '@/components/identify/ImageDropzone'
import { compressImage, fileToDataUrl } from '@/services/identify'
import { runDamageAnalysis } from '@/services/damage'
import { fetchCrops } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { DamageAnalysisResult } from '@/types/database'

const QUESTIONS: Array<{ key: string; label: string; options: string[] }> = [
  { key: 'damageWhere', label: 'Where is the damage?', options: ['Leaves', 'Stem', 'Fruit / pods', 'Roots', 'Whole plant'] },
  { key: 'noticedWhen', label: 'When did you notice it?', options: ['Today', 'This week', '1–2 weeks ago', 'Over a month'] },
  { key: 'insectsVisible', label: 'Are insects visible?', options: ['Yes', 'No', 'Not sure'] },
  { key: 'webbing', label: 'Is there webbing?', options: ['Yes', 'No', 'Not sure'] },
  { key: 'honeydew', label: 'Is there honeydew (sticky residue)?', options: ['Yes, with ants', 'Yes, no ants', 'No', 'Not sure'] },
  { key: 'isIncreasing', label: 'Is the damage increasing?', options: ['Rapidly', 'Slowly', 'No', 'Not sure'] },
]

const ANALYSIS_STEPS = [
  'Analyzing damage image…',
  'Classifying damage pattern…',
  'Checking crop context…',
  'Shortlisting pest groups…',
  'Generating IPM guidance…',
]

export function DamageDetectivePage() {
  const configured = isSupabaseConfigured
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [stage, setStage] = useState<'form' | 'analyzing' | 'result' | 'error'>('form')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<DamageAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cropsQuery = useQuery({ queryKey: ['crops', 'list'], queryFn: fetchCrops })

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

  const setAnswer = (key: string, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  const startAnalysis = async () => {
    setStage('analyzing')
    setError(null)
    setResult(null)
    setStepIndex(0)
    stepTimer.current = setInterval(() => {
      setStepIndex((index) => Math.min(ANALYSIS_STEPS.length - 1, index + 1))
    }, 1100)

    try {
      const imageDataUrl = file ? await compressImage(await fileToDataUrl(file)) : undefined
      const analysis = await runDamageAnalysis({
        crop: crop || undefined,
        imageDataUrl,
        ...answers,
      })
      setResult(analysis)
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
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
    setFile(null)
    setCrop('')
    setAnswers({})
  }

  if (!configured) {
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
          Damage Detective
        </Badge>
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
          What is damaging my crop?
        </h1>
        <p className="mt-2 text-ink-400">
          Upload a plant image and answer a few quick questions. Get the likely damage pattern,
          candidate pest groups and IPM-first advice.
        </p>
      </header>

      {stage === 'form' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                Plant images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageDropzone value={file} previewUrl={previewUrl} onChange={handleFileChange} />
              <p className="mt-2 text-xs text-ink-400">
                Leaf, stem, fruit or whole-plant close-ups help most. Optional.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  Quick questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    Which crop?
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

                {QUESTIONS.map((question) => (
                  <fieldset key={question.key}>
                    <legend className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                      {question.label}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option) => {
                        const active = answers[question.key] === option
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAnswer(question.key, option)}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                              active
                                ? 'border-forest-800 bg-forest-800 text-cream-50'
                                : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                            )}
                            aria-pressed={active}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </CardContent>
            </Card>

            <Button size="lg" fullWidth onClick={startAnalysis}>
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
              Diagnose damage
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
            <Button onClick={() => setStage('form')}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {stage === 'result' && result && (
        <div className="mt-8 space-y-6">
          {result.visionUnavailable && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Plant image could not be analyzed</p>
              <p className="mt-1 text-amber-800">
                No vision-capable AI model is available on this deployment, so this diagnosis is based on
                your answers alone and has low confidence.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-leaf-600" aria-hidden="true" />
            <h2 className="font-serif text-xl font-semibold text-forest-900">Possible diagnosis</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Observed symptoms</CardTitle>
            </CardHeader>
            <CardContent>
              {result.observedSymptoms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.observedSymptoms.map((symptom) => (
                    <Badge key={symptom} tone="cream">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState title="No symptoms classified" description="The image may have been too unclear to read." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Possible damage groups</CardTitle>
              </CardHeader>
              <CardContent>
                {result.possibleGroups.length > 0 ? (
                  <ul className="space-y-2">
                    {result.possibleGroups.map((group, index) => (
                      <li key={group} className="flex items-center gap-2 rounded-lg bg-cream-50 px-3 py-2 text-sm text-ink-600">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-forest-800">
                          {index + 1}
                        </span>
                        {group}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-400">No groups classified.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Possible causes</CardTitle>
              </CardHeader>
              <CardContent>
                {result.candidates.length > 0 ? (
                  <ul className="space-y-3">
                    {result.candidates.map((candidate, index) => (
                      <li key={`${candidate.scientificName}-${index}`} className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-ink-600">{candidate.commonName}</p>
                          {candidate.scientificName && (
                            <p className="text-xs italic text-ink-400">{candidate.scientificName}</p>
                          )}
                          {candidate.reasoning && (
                            <p className="mt-1 text-sm text-ink-500">{candidate.reasoning}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-400">No causes could be shortlisted.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {result.ipmAdvice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanSearch className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  IPM-first guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {result.ipmAdvice.map((advice, index) => (
                    <li key={advice} className="flex items-start gap-3 text-sm leading-relaxed text-ink-600">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-800 text-xs font-semibold text-cream-50">
                        {index + 1}
                      </span>
                      {advice}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.additionalObservations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>What to check next</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-ink-500">
                  {result.additionalObservations.join(' ')}
                </p>
              </CardContent>
            </Card>
          )}

          <p className="max-w-3xl rounded-xl bg-cream-100/60 p-4 text-xs leading-relaxed text-ink-400">
            {result.disclaimer}
          </p>

          <Button variant="secondary" onClick={reset}>
            Diagnose another
          </Button>
        </div>
      )}
    </div>
  )
}