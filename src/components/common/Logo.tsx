import { cn } from '@/lib/utils/cn'
import { Bug } from 'lucide-react'

interface LogoProps {
  className?: string
  wordmark?: boolean
  variant?: 'dark' | 'light'
}

export function Logo({ className, wordmark = true, variant = 'dark' }: LogoProps) {
  const isLight = variant === 'light'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          isLight ? 'bg-cream-50 text-forest-800' : 'bg-forest-800 text-forest-50',
        )}
      >
        <Bug className="h-5 w-5" aria-hidden="true" />
      </span>
      {wordmark && (
        <span
          className={cn(
            'font-serif text-xl font-semibold tracking-tight',
            isLight ? 'text-cream-50' : 'text-forest-900',
          )}
        >
          Entom<span className={isLight ? 'text-leaf-300' : 'text-leaf-600'}>oLens</span>
        </span>
      )}
    </span>
  )
}