import { useState } from 'react'
import type { FormEvent } from 'react'
import { BadgeCheck, Calendar, GraduationCap, Mail, MapPin, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<Profile['role'], string> = {
  student: 'Student',
  farmer: 'Farmer',
  researcher: 'Researcher',
  entomologist: 'Entomologist',
  admin: 'Administrator',
}

export function ProfilePage() {
  const { user, profile, isLoading, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [institution, setInstitution] = useState(profile?.institution ?? '')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!user || !isSupabaseConfigured) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          institution: institution.trim() || null,
          region: region.trim() || null,
        })
        .eq('id', user.id)
      if (updateError) throw updateError
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-cream-200" />
        <div className="h-56 animate-pulse rounded-xl bg-cream-200/80" />
      </div>
    )
  }

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : '—'

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-forest-900">Your profile</h1>
        <p className="mt-1 text-ink-400">Manage your personal information and account.</p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-forest-800 text-3xl font-serif font-semibold text-cream-50">
            {(fullName || profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-serif text-2xl font-semibold text-forest-900">
                {fullName || profile?.full_name || 'Your name'}
              </h2>
              <Badge tone="leaf" className="capitalize">
                {profile ? ROLE_LABELS[profile.role] : '—'}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-400">
              <Mail className="h-4 w-4" aria-hidden="true" /> {user?.email ?? '—'}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-400">
              {profile?.institution && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  {profile.institution}
                </span>
              )}
              {profile?.region && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {profile.region}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Member since {memberSince}
              </span>
            </div>
          </div>
          <Badge tone="cream" className="inline-flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified account
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <p className="text-sm text-ink-400">
            Your role and institution help tailor the experience. Role changes require an
            administrator.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSave(event)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </Field>
            <Field label="Email">
              <Input value={user?.email ?? ''} disabled />
            </Field>
            <Field label="Role">
              <Select value={profile?.role ?? 'student'} disabled>
                <option value={profile?.role ?? 'student'}>
                  {profile ? ROLE_LABELS[profile.role] : '—'}
                </option>
              </Select>
            </Field>
            <Field label="Institution / organization">
              <Input
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="e.g. Regional Agriculture University"
              />
            </Field>
            <Field label="Region" hint="Your state or province, e.g. Punjab.">
              <Input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="e.g. Punjab"
              />
            </Field>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" isLoading={saving}>
                <Save className="h-4 w-4" aria-hidden="true" /> Save changes
              </Button>
              {saved && <p className="text-sm text-leaf-700">Saved successfully.</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}