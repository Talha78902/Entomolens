import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchAdminUsers, ROLES, setUserRole } from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

export function ManageUsersPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      setUserRole(userId, role as (typeof ROLES)[number]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return usersQuery.data ?? []
    return (usersQuery.data ?? []).filter((user) =>
      [user.full_name, user.role, user.institution, user.region]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [usersQuery.data, query])

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to manage users." />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-xl font-semibold text-forest-900">Manage users</h1>
        <p className="mt-0.5 text-sm text-ink-400">Assign roles: student, farmer, researcher, entomologist, admin.</p>
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users…"
          className="h-10 w-full rounded-lg border border-forest-200 bg-white pl-9 pr-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </div>

      {usersQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No users found" description="No profiles match your search." />
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-100 font-serif text-sm font-semibold text-forest-800">
                    {(user.full_name ?? 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-forest-900">
                      {user.full_name ?? 'Unnamed user'}
                      {user.role === 'admin' && (
                        <ShieldAlert className="ml-2 inline h-4 w-4 text-amber-600" aria-hidden="true" />
                      )}
                    </p>
                    <p className="text-xs text-ink-400">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                      {user.institution ? ` · ${user.institution}` : ''}
                      {user.region ? ` · ${user.region}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={user.role === 'admin' ? 'amber' : 'neutral'}>{user.role}</Badge>
                  <select
                    value={user.role}
                    disabled={user.role === 'admin' || roleMutation.isPending || user.id === undefined}
                    onChange={(event) => roleMutation.mutate({ userId: user.id, role: event.target.value })}
                    className={cn(
                      'h-9 rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20',
                      (user.role === 'admin' || user.id === undefined) && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}