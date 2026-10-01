import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Bug,
  Flower2,
  Layers,
  Library,
  ListTree,
  ScanEye,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { fetchAdminStats } from '@/services/admin'

const STATS = [
  { key: 'insects' as const, label: 'Insects', icon: Bug, to: '/admin/insects' },
  { key: 'drafts' as const, label: 'Drafts', icon: ScanEye, to: '/admin/insects' },
  { key: 'crops' as const, label: 'Crops', icon: Flower2, to: '/admin/crops' },
  { key: 'orders' as const, label: 'Orders', icon: Layers, to: '/admin/taxonomy' },
  { key: 'families' as const, label: 'Families', icon: ListTree, to: '/admin/taxonomy' },
  { key: 'genera' as const, label: 'Genera', icon: ListTree, to: '/admin/taxonomy' },
  { key: 'references' as const, label: 'References', icon: Library, to: '/admin/references' },
  { key: 'users' as const, label: 'Users', icon: Users, to: '/admin/users' },
  { key: 'observations' as const, label: 'Observations', icon: ScanEye, to: '/admin/observations' },
  { key: 'pendingObservations' as const, label: 'Pending review', icon: ShieldCheck, to: '/admin/observations' },
]

const SECTIONS = [
  { to: '/admin/insects', title: 'Manage insects', description: 'Review, verify and curate species records.', icon: Bug },
  { to: '/admin/crops', title: 'Manage crops', description: 'Add and edit host crops.', icon: Flower2 },
  { to: '/admin/taxonomy', title: 'Manage taxonomy', description: 'Orders, families and genera.', icon: ListTree },
  { to: '/admin/references', title: 'Manage references', description: 'Scientific citation library.', icon: Library },
  { to: '/admin/users', title: 'Manage users', description: 'Assign roles to community members.', icon: Users },
  { to: '/admin/observations', title: 'Moderate observations', description: 'Approve, reject or remove public records.', icon: ShieldCheck },
]

export function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchAdminStats })

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-forest-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-ink-400">
          Curate the knowledge base, moderate community data and manage users.
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : query.data ? (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map(({ key, label, icon: Icon, to }) => (
            <Link to={to} key={key}>
              <Card className="transition-colors hover:border-leaf-500/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-2xl font-semibold text-forest-900">
                      {query.data?.[key] ?? 0}
                    </span>
                    <Icon className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      <h2 className="mb-4 font-serif text-lg font-semibold text-forest-900">Manage</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ to, title, description, icon: Icon }) => (
          <Link to={to} key={to}>
            <Card className="h-full transition-colors hover:border-leaf-500/60">
              <CardContent className="flex h-full items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-forest-900">{title}</h3>
                  <p className="mt-0.5 text-sm text-ink-400">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-ink-300">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        Verification statuses: draft → reviewed → verified. Public observations must be approved.
      </p>
    </div>
  )
}