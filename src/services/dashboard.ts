import { tryGetSupabase } from '@/lib/supabase/client'

export interface DashboardCounts {
  identifications: number
  observations: number
  favorites: number
  quizScore: number | null
}

export async function fetchDashboardCounts(userId: string): Promise<DashboardCounts> {
  const supabase = tryGetSupabase()
  if (!supabase) return { identifications: 0, observations: 0, favorites: 0, quizScore: null }

  const countFor = async (table: string): Promise<number> => {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    return count ?? 0
  }

  const [identifications, observations, favorites, questionRes, attemptRes] = await Promise.all([
    countFor('identifications'),
    countFor('observations'),
    countFor('favorite_insects'),
    supabase.from('quiz_questions').select('quiz_id'),
    supabase
      .from('quiz_attempts')
      .select('quiz_id, score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null),
  ])

  let quizScore: number | null = null
  const questionCounts = new Map<string, number>()
  for (const row of (questionRes.data ?? []) as Array<{ quiz_id: string }>) {
    questionCounts.set(row.quiz_id, (questionCounts.get(row.quiz_id) ?? 0) + 1)
  }
  const attempts = (attemptRes.data ?? []) as Array<{ quiz_id: string; score: number; total_questions?: number }>
  if (attempts.length > 0) {
    let bestPercentage = 0
    for (const attempt of attempts) {
      const pct = Math.round(attempt.score)
      if (pct > bestPercentage) bestPercentage = pct
    }
    quizScore = bestPercentage > 0 ? bestPercentage : null
  }

  return { identifications, observations, favorites, quizScore }
}