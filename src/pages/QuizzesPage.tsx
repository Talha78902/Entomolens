import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  fetchQuizzes,
  type QuizCategory,
  type QuizDifficulty,
} from '@/services/quizzes'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const CATEGORY_ORDER: QuizCategory[] = [
  'taxonomy',
  'pest-identification',
  'beneficial-insects',
  'life-cycles',
  'crop-pests',
  'ipm',
]

const DIFFICULTY_COLOR: Record<QuizDifficulty, 'leaf' | 'amber' | 'red'> = {
  beginner: 'leaf',
  intermediate: 'amber',
  advanced: 'red',
}

export function QuizzesPage() {
  const query = useQuery({ queryKey: ['quizzes'], queryFn: fetchQuizzes })

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

  if (query.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const quizzes = query.data ?? []

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Quizzes</h1>
        <p className="mt-1 text-sm text-ink-400">
          Test your knowledge across taxonomy, identification, life cycles, crop pests and IPM.
        </p>
      </header>

      {CATEGORY_ORDER.map((category) => {
        const categoryQuizzes = quizzes.filter((quiz) => quiz.category === category)
        if (categoryQuizzes.length === 0) return null
        return (
          <section key={category} className="mb-8">
            <h2 className="mb-3 font-serif text-lg font-semibold text-forest-900">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryQuizzes.map((quiz) => (
                <Card key={quiz.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone={DIFFICULTY_COLOR[quiz.difficulty]}>
                        {DIFFICULTY_LABELS[quiz.difficulty]}
                      </Badge>
                      <span className="text-xs text-ink-400">
                        {quiz.question_count ?? 0} question{(quiz.question_count ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-forest-900">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="mt-1 text-sm leading-relaxed text-ink-400">{quiz.description}</p>
                    )}
                    {quiz.best_score != null ? (
                      <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-leaf-700">
                        <Trophy className="h-4 w-4" aria-hidden="true" />
                        Best score: {quiz.best_score}%
                        {quiz.last_completed_at && (
                          <span className="font-normal text-ink-400">
                            · {new Date(quiz.last_completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-ink-300">Not attempted yet</p>
                    )}
                    <div className="mt-5">
                      <Link to={`/quiz/${quiz.id}`}>
                        <Button variant={quiz.best_score != null ? 'secondary' : 'primary'} fullWidth>
                          <Brain className="h-4 w-4" aria-hidden="true" />
                          {quiz.best_score != null ? 'Retake quiz' : 'Start quiz'}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}