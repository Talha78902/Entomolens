import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-forest-200 bg-cream-100/40 p-8 text-center',
        className,
      )}
    >
      {icon && <div className="text-forest-300">{icon}</div>}
      <div>
        <h3 className="font-serif text-lg font-medium text-forest-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}