import type { DamageAnalysisResult } from '@/types/database'

export interface DamageAnswers {
  crop?: string
  damageWhere?: string
  noticedWhen?: string
  insectsVisible?: string
  webbing?: string
  honeydew?: string
  isIncreasing?: string
  imageDataUrl?: string
}

export async function runDamageAnalysis(answers: DamageAnswers): Promise<DamageAnalysisResult> {
  const response = await fetch('/api/damage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Analysis failed. Please try again.')
  }

  const data = (await response.json()) as { result: DamageAnalysisResult }
  return data.result
}