import { useImageUrl } from '@/hooks/useImageUrl'
import { Sprout } from 'lucide-react'

interface CropImageProps {
  src: string | null | undefined
  alt: string
  /** `card` fills a wide band on the crop list; `thumb` is the small detail-page square. */
  variant: 'card' | 'thumb'
}

/**
 * Render a crop photo, or the sprout placeholder when there is nothing to show.
 *
 * `crops.image_url` holds a bucket-relative path (`insect-images/cotton.jpg`),
 * not a URL, so it must go through useImageUrl to become displayable. Using the
 * raw value as an img src makes the browser request it from the app origin and
 * 404. This is a hook, so it lives in its own component: hooks cannot be called
 * from the list render's .map().
 */
export function CropImage({ src, alt, variant }: CropImageProps) {
  const url = useImageUrl(src, 'insect-images')

  if (!url) {
    const box =
      variant === 'card'
        ? 'mb-4 flex h-36 w-full items-center justify-center rounded-lg bg-cream-100'
        : 'flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-cream-100'
    const icon = variant === 'card' ? 'h-8 w-8' : 'h-8 w-8'
    return (
      <div className={box}>
        <Sprout className={`${icon} text-forest-300`} aria-hidden="true" />
      </div>
    )
  }

  return variant === 'card' ? (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="mb-4 h-36 w-full rounded-lg object-cover"
    />
  ) : (
    <img src={url} alt={alt} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
  )
}
