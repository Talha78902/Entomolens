import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string, role?: Profile['role']) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)