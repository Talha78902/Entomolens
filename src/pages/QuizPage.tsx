import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  fetchQuiz,
  fetchQuizMeta,
  submitQuizAttempt,
  type QuizDifficulty,
  type QuizGrade,
} from '@/services/quizzes'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const DIFFICULTY_COLOR: Record<QuizDifficulty, 'leaf' | 'amber' | 'red'> = {
  beginner: 'leaf',
  intermediate: 'amber',
  advanced: 'red',
}

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const metaQuery = useQuery({
    queryKey: ['quiz-meta', quizId],
    queryFn: () => fetchQuizMeta(quizId ?? ''),
    enabled: isSupabaseConfigured && Boolean(quizId),
  })
  const questionsQuery = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuiz(quizId ?? ''),
    enabled: isSupabaseConfigured && Boolean(quizId),
  })

  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data])

  const [current, setCurrent] = useState(0)
  // Keyed by question id rather than by array index so the map stays correct
  // even if the question list is re-fetched or re-ordered.
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [grade, setGrade] = useState<QuizGrade | null>(null)

  const gradeMutation = useMutation({
    mutationFn: () => submitQuizAttempt(quizId ?? '', answers),
    onSuccess: (result) => {
      setGrade(result)
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['attempts'] })
    },
  })

  const isLast = current === questions.length - 1
  const currentQuestion = questions[current]
  const hasAnswered = Boolean(currentQuestion && answers[currentQuestion.id])

  const choose = (optionId: string) => {
    if (!currentQuestion || answers[currentQuestion.id]) return
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: optionId }))
  }

  const next = () => {
    if (isLast) {
      gradeMutation.mutate()
    } else {
      setCurrent((value) => value + 1)
    }
  }

  const previous = () => {
    if (current === 0) return
    setCurrent((value) => value - 1)
  }

  const jumpTo = (index: number) => setCurrent(index)

  const restart = () => {
    setCurrent(0)
    setAnswers({})
    setGrade(null)
    gradeMutation.reset()
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to take quizzes."
        />
      </div>
    )
  }

  if (questionsQuery.isLoading || metaQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!metaQuery.data) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Quiz not found"
          description="This quiz does not exist."
          action={
            <Link to="/quiz">
              <Button variant="secondary">Back to quizzes</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const meta = metaQuery.data

  // Grading runs in Postgres and the answer key is not readable from the
  // browser (see migration 00013), so a signed-in session is required to take
  // a quiz. Showing a local score would mean shipping is_correct to the client.
  if (!user) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Sign in to take this quiz"
          description="Answers are graded on the server so results and your progress are recorded accurately. You need an account to sit a quiz."
          action={
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (grade) {
    const percent = Math.round(grade.score)
    const resultByQuestion = new Map(grade.results.map((entry) => [entry.question_id, entry]))

    return (
      <div className="mx-auto max-w-xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div
              className={cn(
                'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
                percent >= 70
                  ? 'bg-leaf-100 text-leaf-700'
                  : percent >= 40
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700',
              )}
            >
              <span className="font-serif text-2xl font-semibold">{percent}%</span>
            </div>
            <h1 className="font-serif text-xl font-semibold text-forest-900">{meta.title}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {grade.correct_answers} correct · {grade.wrong_answers} wrong ·{' '}
              {grade.total_questions} questions
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={restart}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
              </Button>
              <Link to="/quiz">
                <Button variant="secondary">All quizzes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-3">
          {questions.map((question) => {
            const entry = resultByQuestion.get(question.id)
            const isCorrect = entry?.is_correct ?? false
            const chosen = entry?.chosen_option_id ?? null
            const correctText = question.options.find(
              (option) => option.id === entry?.correct_option_id,
            )?.option_text
            const chosenText = question.options.find((option) => option.id === chosen)?.option_text

            return (
              <Card key={question.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-forest-900">{question.question}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        <span className="font-medium">Correct answer:</span> {correctText}
                        {!isCorrect && chosenText && (
                          <>
                            {' · '}
                            <span className="text-red-600">Your answer: {chosenText}</span>
                          </>
                        )}
                        {!isCorrect && !chosenText && (
                          <>
                            {' · '}
                            <span className="text-ink-300">You skipped this question</span>
                          </>
                        )}
                      </p>
                      {entry?.explanation && (
                        <p className="mt-1 text-xs italic text-ink-300">{entry.explanation}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="No questions yet"
          description="This quiz has no questions."
          action={
            <Link to="/quiz">
              <Button variant="secondary">Back to quizzes</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="mx-auto max-w-2xl py-6">
      <Link
        to="/quiz"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All quizzes
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-semibold text-forest-900">{meta.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="neutral">{CATEGORY_LABELS[meta.category]}</Badge>
            <Badge tone={DIFFICULTY_COLOR[meta.difficulty]}>
              {DIFFICULTY_LABELS[meta.difficulty]}
            </Badge>
          </div>
        </div>
        <span className="text-sm text-ink-400">
          Question {current + 1} of {questions.length}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-6 flex gap-1.5">
        {questions.map((question, index) => (
          <button
            key={question.id}
            onClick={() => jumpTo(index)}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index === current
                ? 'bg-forest-800'
                : answers[question.id]
                  ? 'bg-leaf-500'
                  : 'bg-forest-100',
            )}
            aria-label={`Go to question ${index + 1}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const isChosen = answers[currentQuestion.id] === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => choose(option.id)}
                  aria-pressed={isChosen}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                    isChosen
                      ? 'border-forest-800 bg-forest-800 text-cream-50'
                      : 'border-forest-200 bg-white text-forest-900 hover:border-leaf-500/60 hover:bg-cream-50',
                  )}
                >
                  <span>{option.option_text}</span>
                  {isChosen && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-xs text-ink-300">
            Answers are graded when you finish, so nothing is marked wrong mid-quiz.
          </p>

          {gradeMutation.isError && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Could not grade this attempt: {gradeMutation.error.message}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={previous} disabled={current === 0}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            <Button onClick={next} disabled={!hasAnswered || gradeMutation.isPending}>
              {isLast ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
