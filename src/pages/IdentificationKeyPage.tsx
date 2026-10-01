import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bug, CheckCircle2, RotateCcw, ScanLine } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  getKeyNode,
  KEY_MAX_DEPTH,
  type KeyNode,
  type KeyResult,
} from '@/lib/identKey'
import { cn } from '@/lib/utils/cn'

interface AnswerStep {
  nodeId: string
  nextId?: string
  optionIndex: number
  label: string
  result?: KeyResult
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

function currentNodeFor(answers: AnswerStep[]): KeyNode | undefined {
  if (answers.length === 0) return getKeyNode('wings') ?? undefined
  const last = answers[answers.length - 1]
  if (!last) return getKeyNode('wings') ?? undefined
  if (last.result || !last.nextId) return undefined
  // Hard depth guard: the key can never run past its longest branch.
  if (answers.length >= KEY_MAX_DEPTH) return undefined
  return getKeyNode(last.nextId) ?? undefined
}

export function IdentificationKeyPage() {
  const [answers, setAnswers] = useState<AnswerStep[]>([])
  const lockRef = useRef(false)

  const node = currentNodeFor(answers)
  const last = answers[answers.length - 1]
  const result: KeyResult | null = last?.result ?? null

  const choose = useCallback(
    (optionIndex: number) => {
      // Guard against rapid double-clicks pushing several steps at once.
      if (lockRef.current) return
      if (!node) return
      const option = node.options[optionIndex]
      if (!option) return
      lockRef.current = true
      const step: AnswerStep = {
        nodeId: node.id,
        ...(option.next ? { nextId: option.next } : {}),
        optionIndex,
        label: option.label,
        ...(option.result ? { result: option.result } : {}),
      }
      setAnswers((previous) => [...previous, step])
      // Release on the next frame so the same click cannot register twice.
      requestAnimationFrame(() => {
        lockRef.current = false
      })
    },
    [node],
  )

  const goBack = useCallback(() => {
    lockRef.current = false
    setAnswers((previous) => previous.slice(0, -1))
  }, [])

  const restart = useCallback(() => {
    lockRef.current = false
    setAnswers([])
  }, [])

  const trim = useCallback((index: number) => {
    lockRef.current = false
    setAnswers((previous) => previous.slice(0, index + 1))
  }, [])

  const stepNumber = Math.min(answers.length + 1, KEY_MAX_DEPTH)

  return (
    <div className="mx-auto max-w-2xl py-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-forest-900">Identification key</h1>
            <p className="mt-1 text-sm text-ink-400">
              Answer a few simple questions to narrow down the taxonomic group of an insect.
            </p>
          </div>
          {answers.length > 0 && !result && (
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restart
            </Button>
          )}
        </div>
      </header>

      {/* Trail of previous choices */}
      {answers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-ink-400">
          {answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => trim(index)}
              className="rounded-full border border-forest-200 bg-white px-2.5 py-1 transition-colors hover:border-leaf-500/60 hover:bg-cream-50"
            >
              {answer.label}
            </button>
          ))}
        </div>
      )}

      {result ? (
        <ResultCard result={result} onBack={goBack} onRestart={restart} />
      ) : node ? (
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-700">
              <ScanLine className="h-4 w-4" aria-hidden="true" />
              Question {String(stepNumber).padStart(2, '0')} / {String(KEY_MAX_DEPTH).padStart(2, '0')}
            </div>
            <CardTitle className="text-lg">{node.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'grid gap-2',
                node.options.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
              )}
            >
              {node.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => choose(index)}
                  className="group flex min-h-24 items-center justify-between gap-3 rounded-xl border border-forest-200 bg-white px-5 py-4 text-left transition-colors hover:border-leaf-500/70 hover:bg-cream-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-leaf-300 bg-leaf-50 text-sm font-bold text-leaf-700 group-hover:border-leaf-500">
                      {LETTERS[index]}
                    </span>
                    <span className="text-base font-medium">{option.label}</span>
                  </span>
                  {option.hint && (
                    <span className="hidden text-xs text-ink-300 sm:block">{option.hint}</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <ResultCardEmpty />
      )}
    </div>
  )
}

function ResultCard({
  result,
  onBack,
  onRestart,
}: {
  result: KeyResult
  onBack: () => void
  onRestart: () => void
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-2xl">
            {result.emoji}
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-forest-900">{result.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">{result.description}</p>
            {result.beneficial != null && (
              <div className="mt-3">
                {result.beneficial ? (
                  <Badge tone="leaf">Beneficial — natural enemy or pollinator</Badge>
                ) : (
                  <Badge tone="red">Pest — manage with IPM</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            Explore examples
          </p>
          <div className="flex flex-wrap gap-2">
            {result.examples.map((example) => (
              <Link
                key={example.label}
                to={`/museum${example.q ? `?q=${encodeURIComponent(example.q)}` : ''}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm font-medium text-forest-900 transition-colors hover:border-leaf-500/60 hover:bg-cream-50"
              >
                <Bug className="h-4 w-4 text-leaf-600" aria-hidden="true" />
                {example.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous question
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultCardEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-leaf-600" aria-hidden="true" />
        <h2 className="font-serif text-lg font-semibold text-forest-900">No match found</h2>
        <p className="text-sm text-ink-400">
          The features don't fit a common agroecosystem group. Try the museum search or use AI
          identification with a clear photo.
        </p>
        <Link to="/identify">
          <Button>AI identify</Button>
        </Link>
      </CardContent>
    </Card>
  )
}