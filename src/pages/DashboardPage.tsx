import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Binoculars,
  Bookmark,
  FlaskConical,
  GraduationCap,
  History,
  ScanSearch,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { fetchDashboardCounts } from '@/services/dashboard'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user, profile } = useAuth()
  const userId = user?.id ?? ''

  const countsQuery = useQuery({
    queryKey: ['dashboard', 'counts', userId],
    queryFn: () => fetchDashboardCounts(userId),
    enabled: isSupabaseConfigured && Boolean(userId),
  })
  const counts = countsQuery.data
  const loading = countsQuery.isLoading

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-forest-900 sm:text-4xl">
          {greeting()}
          {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}.` : '.'}
        </h1>
        <p className="mt-1 text-ink-400">Continue exploring the world of insects.</p>
        {profile?.role && (
          <Badge tone="leaf" className="mt-3">
            {profile.role}
          </Badge>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          to="/history"
          label="Identifications"
          icon={ScanSearch}
          color="forest"
          value={loading ? null : counts?.identifications ?? 0}
        />
        <StatCard
          to="/observations"
          label="Observations"
          icon={Binoculars}
          color="leaf"
          value={loading ? null : counts?.observations ?? 0}
        />
        <StatCard
          to="/favorites"
          label="Favorites"
          icon={Bookmark}
          color="amber"
          value={loading ? null : counts?.favorites ?? 0}
        />
        <StatCard
          to="/quiz"
          label="Quiz score"
          icon={GraduationCap}
          color="forest"
          value={loading ? null : counts?.quizScore}
          suffix="%"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent identifications</CardTitle>
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
            >
              View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No identifications yet"
              description="Upload an insect photo to get your first AI identification."
              icon={<ScanSearch className="h-8 w-8" />}
              action={
                <Link to="/identify">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-800">
                    Identify an insect <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent observations</CardTitle>
            <Link
              to="/observations"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
            >
              Go <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Your field notebook is empty"
              description="Start recording your first field observation."
              icon={<Binoculars className="h-8 w-8" />}
              action={
                <Link to="/observations">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-800">
                    Record an observation <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Research projects</CardTitle>
            <Link
              to="/research"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
            >
              Manage <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No research projects"
              description="Create a project to organize your observations."
              icon={<FlaskConical className="h-8 w-8" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Saved insects</CardTitle>
            <Link
              to="/favorites"
              className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
            >
              Favorites <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Nothing saved yet"
              description="Bookmark insects from the museum to study them later."
              icon={<History className="h-8 w-8" />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  to,
  label,
  icon: Icon,
  color,
  value,
  suffix,
}: {
  to: string
  label: string
  icon: typeof ScanSearch
  color: 'forest' | 'leaf' | 'amber'
  value: number | null | undefined
  suffix?: string
}) {
  const colorClasses = {
    forest: 'bg-forest-800/10 text-forest-800',
    leaf: 'bg-leaf-500/10 text-leaf-700',
    amber: 'bg-amber-100 text-amber-800',
  }[color]

  return (
    <Link
      to={to}
      className="group rounded-xl border border-forest-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-leaf-700">
          {label}
        </p>
        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg', colorClasses)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {value == null ? (
        <div className="mt-3 h-9 w-20 animate-pulse rounded-md bg-cream-200" aria-hidden="true" />
      ) : (
        <p className="mt-3 font-serif text-4xl font-semibold text-forest-900">
          {value}
          {suffix && <span className="text-xl text-ink-400">{suffix}</span>}
        </p>
      )}
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-forest-700 opacity-0 transition-opacity group-hover:opacity-100">
        Open
      </p>
    </Link>
  )
}