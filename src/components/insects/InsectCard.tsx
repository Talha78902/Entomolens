import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bug } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useImageUrl } from '@/hooks/useImageUrl'
import type { InsectListItem } from '@/services/knowledge'

interface InsectCardProps {
  insect: InsectListItem
  lazy?: boolean
}

export function InsectCard({ insect, lazy = true }: InsectCardProps) {
  const image = insect.images?.[0] ?? null
  const url = useImageUrl(image ?? '')
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(url) && !failed

  return (
    <Link
      to={`/museum/${insect.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-forest-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-cream-100">
        {showImage ? (
          <img
            src={url!}
            alt={insect.common_name}
            loading={lazy ? 'lazy' : 'eager'}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-forest-200">
            <Bug className="h-10 w-10" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider text-forest-200/80">
              Image coming soon
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {insect.is_pest && <Badge tone="red">Pest</Badge>}
          {insect.is_beneficial && <Badge tone="leaf">Beneficial</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-base font-semibold text-forest-900 group-hover:text-forest-700">
          {insect.common_name}
        </h3>
        <p className="mt-0.5 text-sm italic text-ink-400">{insect.scientific_name}</p>
        <div className="mt-3 space-y-0.5 border-t border-forest-100 pt-3">
          {insect.order_name && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-800">
              {insect.order_name}
            </p>
          )}
          {insect.family_name && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300">
              {insect.family_name}
            </p>
          )}
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700 transition-colors group-hover:text-forest-900">
          View specimen
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}