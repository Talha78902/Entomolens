import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Binoculars,
  Bookmark,
  Bot,
  FlaskConical,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  ScanSearch,
  Settings,
  Stethoscope,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'scan-search': ScanSearch,
  'stethoscope': Stethoscope,
  'history': History,
  'bookmark': Bookmark,
  'binoculars': Binoculars,
  'map': Map,
  'flask-conical': FlaskConical,
  'bot': Bot,
  'graduation-cap': GraduationCap,
}

const dashboardLinks = [
  { label: 'Dashboard', to: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Identify', to: '/identify', icon: 'scan-search' },
  { label: 'Damage Detective', to: '/damage-detective', icon: 'stethoscope' },
  { label: 'History', to: '/history', icon: 'history' },
  { label: 'Favorites', to: '/favorites', icon: 'bookmark' },
  { label: 'Observations', to: '/observations', icon: 'binoculars' },
  { label: 'Map', to: '/map', icon: 'map' },
  { label: 'Research', to: '/research', icon: 'flask-conical' },
  { label: 'Ask EntomoAI', to: '/assistant', icon: 'bot' },
  { label: 'Quizzes', to: '/quiz', icon: 'graduation-cap' },
] as const

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        {dashboardLinks.map((link) => {
          const Icon = iconMap[link.icon] ?? LayoutDashboard
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-forest-800 text-cream-50'
                    : 'text-ink-400 hover:bg-forest-100/60 hover:text-forest-800',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {link.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-forest-100 p-3">
        <div className="mb-2 px-3 py-2">
          <p className="truncate text-sm font-medium text-forest-900">
            {profile?.full_name || 'User'}
          </p>
          <p className="truncate text-xs capitalize text-ink-400">{profile?.role || '—'}</p>
        </div>
        <div className="mb-2 flex gap-1">
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-forest-800 text-cream-50'
                  : 'text-ink-400 hover:bg-forest-100/60 hover:text-forest-800',
              )
            }
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Profile
          </NavLink>
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-forest-800 text-cream-50'
                  : 'text-ink-400 hover:bg-forest-100/60 hover:text-forest-800',
              )
            }
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Settings
          </NavLink>
        </div>
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => {
            void signOut()
            navigate('/')
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-forest-100 bg-white lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close dashboard menu"
            className="absolute inset-0 bg-forest-950/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 bg-white shadow-lift">
            <button
              type="button"
              aria-label="Close dashboard menu"
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-forest-800 hover:bg-forest-100"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-forest-100 bg-cream-50/85 px-4 backdrop-blur lg:hidden">
          <Logo wordmark={false} />
          <button
            type="button"
            aria-label="Open dashboard menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-forest-800 hover:bg-forest-100"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}