import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
    )
  }
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabase()
  } catch {
    return null
  }
}

export function buildPublicUrl(
  path: string | null | undefined,
  bucket: string,
): string | null {
  if (!path) return null
  const supabase = tryGetSupabase()
  if (!supabase) return path
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Buckets whose objects are readable without a signed URL. */
const PUBLIC_BUCKETS = new Set(['insect-images'])

export function isPublicBucket(bucket: string): boolean {
  return PUBLIC_BUCKETS.has(bucket)
}

export interface ResolvedImage {
  url: string | null
  /** True when the object lives in a private bucket and needed a signed URL. */
  signed: boolean
}

/**
 * Split a stored image reference into its bucket and object key.
 *
 * Accepts three shapes:
 *   "insect-images/a/b.jpg"        -> bucket + key
 *   "<user_id>/photo.jpg"          -> bucket supplied separately, key is the path
 *   "https://.../storage/v1/object/public/<bucket>/<key>" -> parsed from URL
 *   "https://example.org/img.jpg"  -> external, returned as-is
 */
export function parseImageRef(
  path: string,
  fallbackBucket?: string,
): { bucket: string; key: string } | { external: string } | null {
  const viaStorage = path.match(
    /^https?:\/\/[^.]+\.supabase\.co\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)$/,
  )
  if (viaStorage) return { bucket: viaStorage[2]!, key: viaStorage[3]! }
  if (path.startsWith('http')) return { external: path }

  const slash = path.indexOf('/')
  if (slash > 0) {
    // "bucket/key" form: the prefix before the first slash is the bucket.
    return { bucket: path.slice(0, slash), key: path.slice(slash + 1) }
  }
  if (fallbackBucket) return { bucket: fallbackBucket, key: path }
  return null
}

/**
 * Resolve a stored image reference to a displayable URL.
 *
 * Private buckets MUST use createSignedUrl; getPublicUrl returns a URL that
 * 400s for non-public objects, which is why private photos used to render blank.
 */
export async function resolveImageUrl(
  path: string | null | undefined,
  fallbackBucket?: string,
  expiresInSeconds = 60 * 60,
): Promise<ResolvedImage> {
  if (!path) return { url: null, signed: false }
  const supabase = tryGetSupabase()
  if (!supabase) return { url: path, signed: false }

  const parsed = parseImageRef(path, fallbackBucket)
  if (!parsed) return { url: null, signed: false }
  if ('external' in parsed) return { url: parsed.external, signed: false }

  if (isPublicBucket(parsed.bucket)) {
    const { data } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.key)
    return { url: data.publicUrl, signed: false }
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.key, expiresInSeconds)
  if (error) return { url: null, signed: true }
  return { url: data?.signedUrl ?? null, signed: true }
}
