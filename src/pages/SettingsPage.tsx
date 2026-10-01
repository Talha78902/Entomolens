import { Mail, Shield, User, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<Profile['role'], string> = {
  student: 'Student',
  farmer: 'Farmer',
  researcher: 'Researcher',
  entomologist: 'Entomologist',
  admin: 'Administrator',
}

export function SettingsPage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-cream-200" />
        <div className="h-40 animate-pulse rounded-xl bg-cream-200/80" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-forest-900">Settings</h1>
        <p className="mt-1 text-ink-400">Account and application preferences.</p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Account</CardTitle>
          <Badge tone="leaf" className="capitalize">
            {profile ? ROLE_LABELS[profile.role] : '—'}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-forest-100">
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-400">
                <User className="h-4 w-4" aria-hidden="true" /> Full name
              </dt>
              <dd className="text-sm font-medium text-forest-900">
                {profile?.full_name || '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-400">
                <Mail className="h-4 w-4" aria-hidden="true" /> Email
              </dt>
              <dd className="text-sm font-medium text-forest-900">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-400">
                <Shield className="h-4 w-4" aria-hidden="true" /> Member since
              </dt>
              <dd className="text-sm font-medium text-forest-900">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-400">
            Sign out of this device. You can sign back in anytime with your email and password.
          </p>
          <Button variant="danger" className="mt-4" onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}