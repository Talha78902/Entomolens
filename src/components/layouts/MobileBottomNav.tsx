import { Link, NavLink } from 'react-router-dom'
import { Bot, Compass, Home, ScanSearch, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end: boolean
  prominent?: boolean
}

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/museum', label: 'Explore', icon: Compass, end: false },
  { to: '/identify', label: 'Identify', icon: ScanSearch, end: false, prominent: true },
  { to: '/assistant', label: 'AI', icon: Bot, end: false },
]

export function MobileBottomNav() {
  const { user } = useAuth()
  const profileTo = user ? '/dashboard' : '/login'

  const linkClass = (isActive: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
      isActive ? 'text-forest-800' : 'text-ink-400',
    )

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-100 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Mobile bottom navigation"
    >
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          if (item.prominent) {
            return (
              <NavLink key={item.to} to={item.to} end={item.end} aria-label="Identify an insect">
                {({ isActive }) => (
                  <span className="flex flex-col items-center justify-center">
                    <span
                      className={cn(
                        'flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full border-4 border-cream-50 shadow-lift transition-colors',
                        isActive ? 'bg-leaf-600 text-cream-50' : 'bg-forest-800 text-cream-50',
                      )}
                      aria-hidden="true"
                    >
                      <ScanSearch className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        '-mt-2 text-[11px] font-medium',
                        isActive ? 'text-forest-800' : 'text-ink-400',
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                )}
              </NavLink>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}

        <Link to={profileTo} className={linkClass(false)}>
          <UserRound className="h-5 w-5" aria-hidden="true" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  )
}