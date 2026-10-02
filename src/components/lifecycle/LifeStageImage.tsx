import { useImageUrl } from '@/hooks/useImageUrl'
import { Leaf } from 'lucide-react'

interface LifeStageImageProps {
  src: string | null | undefined
  alt: string
  /** `panel` is the large illustration beside the selected stage; `chip` is the timeline thumbnail. */
  variant: 'panel' | 'chip'
}

/**
 * Render a life-stage illustration, or a leaf placeholder when there is nothing to show.
 *
 * `life_cycles.image_url` holds a root-relative asset path
 * (`/lifecycle-stages/helicoverpa-armigera-larva.svg`), not a storage object key, so
 * it must NOT go through useImageUrl: parseImageRef treats anything without a
 * leading-slash-free `bucket/key` shape as belonging to the fallback bucket and
 * returns a Supabase URL for a key that does not exist, which renders as a broken
 * image rather than falling back.
 *
 * Bucket-relative refs are still supported, because a stage may later be given a
 * real photograph in the insect-images bucket, so both forms resolve here. The
 * hook cannot be called conditionally, hence the null argument on the direct path.
 */
export function LifeStageImage({ src, alt, variant }: LifeStageImageProps) {
  const isDirect = Boolean(src && (src.startsWith('/') || src.startsWith('http')))
  const bucketUrl = useImageUrl(isDirect ? null : src, 'insect-images')
  const url = isDirect ? (src as string) : bucketUrl

  if (!url) {
    const box =
      variant === 'panel'
        ? 'flex h-44 w-full shrink-0 items-center justify-center rounded-xl bg-cream-100'
        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100'
    return (
      <div className={box}>
        <Leaf className="h-5 w-5 text-forest-300" aria-hidden="true" />
      </div>
    )
  }

  if (variant === 'chip') {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        aria-hidden="true"
        className="h-8 w-8 shrink-0 rounded-full border border-forest-100 bg-white object-cover"
      />
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-44 w-full shrink-0 rounded-xl border border-forest-100 bg-white object-contain"
    />
  )
}