import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Link, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/hooks/AuthProvider'
import { RootLayout } from '@/components/layouts/RootLayout'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ProtectedRoute, RoleRoute } from '@/components/common/RouteGuards'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MuseumPage = lazy(() => import('@/pages/MuseumPage').then((m) => ({ default: m.MuseumPage })))
const InsectDetailPage = lazy(() => import('@/pages/InsectDetailPage').then((m) => ({ default: m.InsectDetailPage })))
const TaxonomyPage = lazy(() => import('@/pages/TaxonomyPage').then((m) => ({ default: m.TaxonomyPage })))
const CropsPage = lazy(() => import('@/pages/CropsPage').then((m) => ({ default: m.CropsPage })))
const CropDetailPage = lazy(() => import('@/pages/CropDetailPage').then((m) => ({ default: m.CropDetailPage })))
const BeneficialInsectsPage = lazy(() => import('@/pages/BeneficialInsectsPage').then((m) => ({ default: m.BeneficialInsectsPage })))
const LifeCycleExplorerPage = lazy(() => import('@/pages/LifeCycleExplorerPage').then((m) => ({ default: m.LifeCycleExplorerPage })))
const IdentifyPage = lazy(() => import('@/pages/IdentifyPage').then((m) => ({ default: m.IdentifyPage })))
const DamageDetectivePage = lazy(() => import('@/pages/DamageDetectivePage').then((m) => ({ default: m.DamageDetectivePage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })))
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ObservationsPage = lazy(() => import('@/pages/ObservationsPage').then((m) => ({ default: m.ObservationsPage })))
const ObservationDetailPage = lazy(() => import('@/pages/ObservationDetailPage').then((m) => ({ default: m.ObservationDetailPage })))
const MapPage = lazy(() => import('@/pages/MapPage').then((m) => ({ default: m.MapPage })))
const ResearchPage = lazy(() => import('@/pages/ResearchPage').then((m) => ({ default: m.ResearchPage })))
const ResearchProjectDetailPage = lazy(() => import('@/pages/ResearchProjectDetailPage').then((m) => ({ default: m.ResearchProjectDetailPage })))
const IdentificationKeyPage = lazy(() => import('@/pages/IdentificationKeyPage').then((m) => ({ default: m.IdentificationKeyPage })))
const QuizzesPage = lazy(() => import('@/pages/QuizzesPage').then((m) => ({ default: m.QuizzesPage })))
const QuizPage = lazy(() => import('@/pages/QuizPage').then((m) => ({ default: m.QuizPage })))
const GlobalSearchPage = lazy(() => import('@/pages/GlobalSearchPage').then((m) => ({ default: m.GlobalSearchPage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const ManageInsectsPage = lazy(() => import('@/pages/admin/ManageInsectsPage').then((m) => ({ default: m.ManageInsectsPage })))
const ManageCropsPage = lazy(() => import('@/pages/admin/ManageCropsPage').then((m) => ({ default: m.ManageCropsPage })))
const ManageTaxonomyPage = lazy(() => import('@/pages/admin/ManageTaxonomyPage').then((m) => ({ default: m.ManageTaxonomyPage })))
const ManageReferencesPage = lazy(() => import('@/pages/admin/ManageReferencesPage').then((m) => ({ default: m.ManageReferencesPage })))
const ManageUsersPage = lazy(() => import('@/pages/admin/ManageUsersPage').then((m) => ({ default: m.ManageUsersPage })))
const ModerateObservationsPage = lazy(() => import('@/pages/admin/ModerateObservationsPage').then((m) => ({ default: m.ModerateObservationsPage })))

/**
 * Route-level error surface.
 *
 * A genuine 404 (no route matched / loader threw a 404 response) shows "404".
 * Anything else is a real crash and is reported as an error, NOT as a 404.
 * Previously every non-route error was rendered as "This page could not be
 * found.", which hid real render bugs behind a misleading not-found message.
 */
function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    const notFound = error.status === 404
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-24 text-center">
        <h1 className="font-serif text-5xl font-semibold text-forest-900">{error.status}</h1>
        <p className="mt-3 text-ink-400">
          {notFound
            ? 'We could not find the page you were looking for.'
            : error.statusText || 'This request could not be completed.'}
        </p>
        <Link to="/" className="mt-8">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    )
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : 'An unexpected error interrupted this page.'

  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-24 text-center">
      <h1 className="font-serif text-4xl font-semibold text-forest-900">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-ink-400">
        This page failed to load. This is an application error, not a missing page.
      </p>
      <pre className="mt-6 max-w-full overflow-x-auto rounded-lg bg-cream-100 px-4 py-3 text-left text-xs text-ink-400">
        {message}
      </pre>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Link to="/">
          <Button variant="ghost">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
)

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/search', element: withSuspense(<GlobalSearchPage />) },
      { path: '/identify', element: withSuspense(<IdentifyPage />) },
      { path: '/drop', element: withSuspense(<IdentifyPage />) },
      { path: '/damage-detective', element: withSuspense(<DamageDetectivePage />) },
      { path: '/identification-key', element: withSuspense(<IdentificationKeyPage />) },
      { path: '/museum', element: withSuspense(<MuseumPage />) },
      { path: '/museum/:insectId', element: withSuspense(<InsectDetailPage />) },
      { path: '/taxonomy', element: withSuspense(<TaxonomyPage />) },
      { path: '/crops', element: withSuspense(<CropsPage />) },
      { path: '/crops/:cropId', element: withSuspense(<CropDetailPage />) },
      { path: '/life-cycles', element: withSuspense(<LifeCycleExplorerPage />) },
      { path: '/beneficial-insects', element: withSuspense(<BeneficialInsectsPage />) },
      { path: '/assistant', element: withSuspense(<AssistantPage />) },
      { path: '/quiz', element: withSuspense(<QuizzesPage />) },
      { path: '/quiz/:quizId', element: withSuspense(<QuizPage />) },
    ],
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/signup',
    element: withSuspense(<SignupPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/dashboard', element: withSuspense(<DashboardPage />) },
      { path: '/history', element: withSuspense(<HistoryPage />) },
      { path: '/favorites', element: withSuspense(<FavoritesPage />) },
      { path: '/observations', element: withSuspense(<ObservationsPage />) },
      { path: '/observations/:observationId', element: withSuspense(<ObservationDetailPage />) },
      { path: '/map', element: withSuspense(<MapPage />) },
      { path: '/research', element: withSuspense(<ResearchPage />) },
      { path: '/research/:projectId', element: withSuspense(<ResearchProjectDetailPage />) },
      { path: '/profile', element: withSuspense(<ProfilePage />) },
      { path: '/settings', element: withSuspense(<SettingsPage />) },
    ],
  },
  {
    element: (
      <RoleRoute role="admin">
        <DashboardLayout />
      </RoleRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/admin', element: withSuspense(<AdminDashboardPage />) },
      { path: '/admin/insects', element: withSuspense(<ManageInsectsPage />) },
      { path: '/admin/crops', element: withSuspense(<ManageCropsPage />) },
      { path: '/admin/taxonomy', element: withSuspense(<ManageTaxonomyPage />) },
      { path: '/admin/references', element: withSuspense(<ManageReferencesPage />) },
      { path: '/admin/users', element: withSuspense(<ManageUsersPage />) },
      { path: '/admin/observations', element: withSuspense(<ModerateObservationsPage />) },
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
