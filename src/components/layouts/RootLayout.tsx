import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SiteHeader } from '@/components/layouts/SiteHeader'
import { SiteFooter } from '@/components/layouts/SiteFooter'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'

export function RootLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/search')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-cream-50 pb-16 lg:pb-0">
      <SiteHeader />
      <main key={location.pathname} className="flex-1 animate-page-in">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  )
}