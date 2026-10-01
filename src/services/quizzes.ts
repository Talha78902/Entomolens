import { tryGetSupabase } from '@/lib/supabase/client'

export type QuizCategory =
  | 'taxonomy'
  | 'pest-identification'
  | 'beneficial-insects'
  | 'life-cycles'
  | 'crop-pests'
  | 'ipm'

export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Quiz {
  id: string
  title: string
  category: QuizCategory
  difficulty: QuizDifficulty
  description?: string | null
  question_count?: number
  best_score?: number | null
  last_completed_at?: string | null
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  explanation?: string | null
  order: number
  options: Array<{
    id: string
    option_text: string
    order: number
  }>
}

/** Per-question outcome returned by the server-side grader. */
export interface QuizResultEntry {
  question_id: string
  chosen_option_id: string | null
  correct_option_id: string | null
  is_correct: boolean
  explanation?: string | null
}

export interface QuizGrade {
  quiz_id: string
  score: number
  total_questions: number
  correct_answers: number
  wrong_answers: number
  results: QuizResultEntry[]
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  created_at: string
  completed_at: string
  score: number
  total_questions: number
  correct_answers: number
  wrong_answers: number
}

export const CATEGORY_LABELS: Record<QuizCategory, string> = {
  taxonomy: 'Taxonomy',
  'pest-identification': 'Pest Identification',
  'beneficial-insects': 'Beneficial Insects',
  'life-cycles': 'Life Cycles',
  'crop-pests': 'Crop Pests',
  ipm: 'IPM',
}

export const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export async function fetchQuizzes(): Promise<Quiz[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const { data } = await supabase
    .from('quizzes')
    .select('id, title, category, difficulty, description')
    .order('category')
    .order('difficulty')

  const quizzes = (data ?? []) as Quiz[]

  if (!userId) return quizzes.map((quiz) => ({ ...quiz, question_count: 0, best_score: null }))

  const questionRows = await supabase
    .from('quiz_questions')
    .select('quiz_id')
    .then((r) => r.data ?? [])

  const attemptRows = await supabase
    .from('quiz_attempts')
    .select('quiz_id, score, completed_at')
    .eq('user_id', userId)
    .then((r) => r.data ?? [])

  const questionCounts = new Map<string, number>()
  for (const row of questionRows) {
    const id = (row as { quiz_id: string }).quiz_id
    questionCounts.set(id, (questionCounts.get(id) ?? 0) + 1)
  }

  const bestScores = new Map<string, { score: number; completed_at: string }>()
  for (const row of attemptRows) {
    const attempt = row as { quiz_id: string; score: number; completed_at: string | null }
    if (!attempt.completed_at) continue
    const best = bestScores.get(attempt.quiz_id)
    if (!best || attempt.score > best.score) {
      bestScores.set(attempt.quiz_id, { score: attempt.score, completed_at: attempt.completed_at })
    }
  }

  return quizzes.map((quiz) => {
    const best = bestScores.get(quiz.id)
    return {
      ...quiz,
      question_count: questionCounts.get(quiz.id) ?? 0,
      best_score: best?.score ?? null,
      last_completed_at: best?.completed_at ?? null,
    }
  })
}

export async function fetchQuiz(quizId: string): Promise<QuizQuestion[] | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, quiz_id, question, explanation, order')
    .eq('quiz_id', quizId)
    .order('order')

  if (!questions) return null

  const questionIds = [...(questions as Array<{ id: string }>).map((question) => question.id)]
  if (questionIds.length === 0) return []

  const { data: options } = await supabase
    .from('quiz_options')
    .select('id, question_id, option_text, order')
    .in('question_id', questionIds)
    .order('order')

  const optionsByQuestion = new Map<string, QuizQuestion['options']>()
  for (const option of (options ?? []) as Array<{
    id: string
    question_id: string
    option_text: string
    order: number
  }>) {
    const list = optionsByQuestion.get(option.question_id) ?? []
    list.push({
      id: option.id,
      option_text: option.option_text,
      order: option.order,
    })
    optionsByQuestion.set(option.question_id, list)
  }

  return (questions as Array<{
    id: string
    quiz_id: string
    question: string
    explanation?: string | null
    order: number
  }>).map((question) => ({
    ...question,
    options: optionsByQuestion.get(question.id) ?? [],
  }))
}

export async function fetchQuizMeta(quizId: string): Promise<Quiz | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('quizzes')
    .select('id, title, category, difficulty, description')
    .eq('id', quizId)
    .maybeSingle()
  return (data as Quiz | null) ?? null
}

/**
 * Grades a submission in Postgres and records the attempt.
 *
 * The answers map is keyed by question id. Grading deliberately happens on the
 * server (migration 00013): quiz_options.is_correct is no longer selectable
 * through the REST API and quiz_attempts rejects client INSERTs, so the score
 * stored here cannot be chosen by the caller.
 */
export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string>,
): Promise<QuizGrade | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null

  const payload: Record<string, string> = {}
  for (const [questionId, optionId] of Object.entries(answers)) {
    if (optionId) payload[questionId] = optionId
  }

  const { data, error } = await supabase.rpc('submit_quiz', {
    p_quiz_id: quizId,
    p_answers: payload,
  })
  if (error) throw new Error(error.message)

  return (data ?? null) as QuizGrade | null
}

export async function fetchMyAttempts(): Promise<QuizAttempt[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50)
  return (data ?? []) as QuizAttempt[]
}