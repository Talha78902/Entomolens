import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type Tone = 'forest' | 'leaf' | 'cream' | 'amber' | 'red' | 'neutral'

const toneClasses: Record<Tone, string> = {
  forest: 'bg-forest-800/10 text-forest-800 border-forest-800/20',
  leaf: 'bg-leaf-500/10 text-leaf-700 border-leaf-500/25',
  cream: 'bg-cream-200/60 text-ink-700 border-cream-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-ink-100/70 text-ink-600 border-ink-200',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}