import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/common/AuthShell'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { ConfigNotice } from '@/components/common/RouteGuards'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/database'

const roles: Array<{ value: Profile['role']; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'researcher', label: 'Researcher' },
]

export function SignupPage() {
  const { signUp, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Profile['role']>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      await signUp(email.trim(), password, fullName.trim(), role)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConfigured) {
    return (
      <AuthShell>
        <ConfigNotice />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="font-serif text-2xl font-semibold text-forest-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink-400">Join the EntomoLens community.</p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Full name" htmlFor="signup-name">
          <Input
            id="signup-name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </Field>
        <Field label="I am a" htmlFor="signup-role">
          <Select
            id="signup-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Profile['role'])}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email address" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="signup-password" hint="At least 6 characters">
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm password" htmlFor="signup-confirm">
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-forest-700 hover:text-forest-800">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}