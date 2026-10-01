import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils/cn'

export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100/60 px-4 py-10">
      <Link to="/" aria-label="Back to EntomoLens home" className="mb-8">
        <Logo />
      </Link>
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border border-forest-100 bg-white p-8 shadow-lift',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}