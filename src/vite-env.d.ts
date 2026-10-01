/// <reference types="vite/client" />

// Only variables prefixed with VITE_ are exposed to the browser bundle, so the
// AI provider keys (GEMINI_*, GROQ_*) are intentionally absent here. Declaring
// a VITE_-prefixed key for a provider would publish it to every visitor.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
