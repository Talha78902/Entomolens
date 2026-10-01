import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthContext } from '@/hooks/auth-context'
import type { Profile } from '@/types/database'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // When Supabase is not configured there is no session to wait for, so there is
  // nothing to load. Deriving the initial value avoids an effect that exists only
  // to immediately undo it.
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured)

  const isConfigured = isSupabaseConfigured

  async function loadProfile(uid: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (!error && data) {
      setProfile(data as Profile)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const supabase = getSupabase()
    let active = true

    // The subscription must be created synchronously so the effect can return
    // a real teardown. Previously it was created inside an async function whose
    // returned cleanup function was discarded, so the auth listener was never
    // unsubscribed.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        void loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      }
      if (active) setIsLoading(false)
    })()

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    return {
      user,
      profile,
      isLoading,
      isConfigured,
      async signIn(email: string, password: string) {
        const supabase = getSupabase()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email: string, password: string, fullName?: string, role: Profile['role'] = 'student') {
        const supabase = getSupabase()
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName ?? '',
              // The requested role is stored separately, NOT in auth metadata.
              // `role` in user metadata is client-controlled, and handle_new_user
              // would otherwise honour it. See migration 00012.
              requested_role: role === 'student' ? undefined : role,
            },
          },
        })
        if (error) throw error
      },
      async signOut() {
        const supabase = getSupabase()
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setProfile(null)
      },
      async refreshProfile() {
        if (!user) return
        await loadProfile(user.id)
      },
    }
  }, [user, profile, isLoading, isConfigured])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}