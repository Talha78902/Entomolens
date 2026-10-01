import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/database'

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, isLoading, isConfigured } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session" />

  if (!isConfigured) {
    return (
      <div className="container-page py-16">
        <ConfigNotice />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children ?? <Outlet />
}

export function RoleRoute({ role, children }: { role: Role; children?: ReactNode }) {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking access" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (profile?.role !== role && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children ?? <Outlet />
}

export function ConfigNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
      <h2 className="font-serif text-xl font-semibold text-amber-900">Configuration needed</h2>
      <p className="mt-2 text-sm text-amber-800">
        Supabase environment variables are not set. Add <code className="text-xs">VITE_SUPABASE_URL</code>{' '}
        and <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to your environment, then reload.
      </p>
    </div>
  )
}