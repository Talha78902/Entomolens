import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export function PendingFeature({ title, description }: { title: string; description?: string }) {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800/10 text-forest-800">
          <Construction className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-forest-900">{title}</h1>
        <p className="mt-3 text-ink-400">
          {description ?? 'This module is part of the EntomoLens roadmap and is being built next.'}
        </p>
        <Badge tone="amber" className="mt-6">
          Coming soon
        </Badge>
      </div>
    </div>
  )
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-forest-900">{title}</h1>
        {description && <p className="mt-1 text-ink-400">{description}</p>}
      </div>
      {children}
    </header>
  )
}