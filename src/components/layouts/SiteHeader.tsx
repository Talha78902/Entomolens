import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogIn, Menu, ScanSearch, UserRound, X } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/Button'
import { NAV_LINKS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

export function SiteHeader() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors hover:text-forest-800',
      isActive ? 'text-forest-800' : 'text-ink-400',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-forest-100 bg-cream-50/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="EntomoLens home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass} end={link.to === '/identify'}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void signOut()
                  navigate('/')
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate('/signup')}>
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-forest-800 hover:bg-forest-100 lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden">
          <nav
            className="container-page border-t border-forest-100 bg-cream-50 py-4"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={navClass}
                >
                  <span className="block rounded-lg px-3 py-2.5 hover:bg-forest-100/60">
                    {link.label}
                  </span>
                </NavLink>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-forest-100 pt-4">
              {user ? (
                <>
                  <Button
                    fullWidth
                    onClick={() => {
                      setOpen(false)
                      navigate('/dashboard')
                    }}
                  >
                    Dashboard {profile?.full_name ? `— ${profile.full_name}` : ''}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setOpen(false)
                      void signOut()
                      navigate('/')
                    }}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setOpen(false)
                      navigate('/login')
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => {
                      setOpen(false)
                      navigate('/signup')
                    }}
                  >
                    Get started
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}