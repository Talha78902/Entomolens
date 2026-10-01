import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { label: 'Insect Museum', to: '/museum' },
      { label: 'Identify an Insect', to: '/identify' },
      { label: 'Search', to: '/search' },
      { label: 'Crop Explorer', to: '/crops' },
      { label: 'Life Cycles', to: '/life-cycles' },
      { label: 'Beneficial Insects', to: '/beneficial-insects' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Identification Key', to: '/identification-key' },
      { label: 'Quizzes', to: '/quiz' },
      { label: 'EntomoAI Assistant', to: '/assistant' },
      { label: 'Research', to: '/research' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Observations', to: '/observations' },
      { label: 'History', to: '/history' },
      { label: 'Favorites', to: '/favorites' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-forest-900 bg-forest-900 text-cream-100">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo wordmark={false} variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-200/80">
              AI-powered insect identification, pest diagnosis and entomology intelligence for
              farmers, students, researchers and entomologists.
            </p>
          </div>
          {footerColumns.map((col) => (
            <nav key={col.title} className="md:col-span-2" aria-label={col.title}>
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-leaf-300">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-cream-200/80 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-forest-800 pt-6 text-xs text-cream-200/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} EntomoLens. Scientific information for education and research.</p>
          <p>Identification results are AI-assisted and are not a substitute for expert verification.</p>
        </div>
      </div>
    </footer>
  )
}