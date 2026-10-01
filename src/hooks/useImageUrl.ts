import { useEffect, useState } from 'react'
import { isPublicBucket, parseImageRef, resolveImageUrl, tryGetSupabase } from '@/lib/supabase/client'

/**
 * Resolve a stored image reference to a displayable URL.
 *
 * Public buckets resolve synchronously (curated species images are plain
 * external URLs or objects in the public `insect-images` bucket), so the common
 * case renders with no flash and no extra render pass. Private buckets need
 * `createSignedUrl`, which is async, and therefore resolve after a tick.
 *
 * The synchronous result is derived during render rather than copied into state
 * by an effect. Copying it would schedule a second render pass for every ref
 * change even though the value was already known, and would let the image lag
 * one paint behind the data it belongs to.
 */
export function useImageUrl(
  path: string | null | undefined,
  fallbackBucket?: string,
  expiresInSeconds = 60 * 60,
): string | null {
  const immediate = resolveSynchronously(path, fallbackBucket)

  // Async results are tagged with the inputs they were produced for, so a slow
  // response for a previous ref can never overwrite the current one.
  const requestKey = `${path ?? ''}|${fallbackBucket ?? ''}|${expiresInSeconds}`
  const [signed, setSigned] = useState<{ key: string; url: string | null } | null>(null)
  const signedUrl = signed?.key === requestKey ? signed.url : null

  const needsSigning = immediate === null && Boolean(path)

  useEffect(() => {
    if (!needsSigning || !path) return

    let active = true
    void resolveImageUrl(path, fallbackBucket, expiresInSeconds).then((result) => {
      if (active) setSigned({ key: requestKey, url: result.url })
    })
    return () => {
      active = false
    }
  }, [needsSigning, path, fallbackBucket, expiresInSeconds, requestKey])

  return immediate ?? signedUrl
}

/** Fast path: public buckets and absolute external URLs. */
function resolveSynchronously(path: string | null | undefined, fallbackBucket?: string): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path

  const parsed = parseImageRef(path, fallbackBucket)
  if (!parsed || 'external' in parsed) return parsed && 'external' in parsed ? parsed.external : null
  if (!isPublicBucket(parsed.bucket)) return null

  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.key)
  return data.publicUrl
}