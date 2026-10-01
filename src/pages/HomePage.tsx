import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Binoculars,
  BookOpen,
  Bug,
  FlaskConical,
  GraduationCap,
  Leaf,
  MapPin,
  ScanSearch,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InsectCard } from '@/components/insects/InsectCard'
import { FEATURED_CROPS } from '@/lib/constants'
import { HeroIllustration } from '@/components/common/HeroIllustration'
import { fetchInsectList } from '@/services/knowledge'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const quickActions = [
  {
    label: 'Identify an Insect',
    to: '/identify',
    description: 'Upload a photo and receive a ranked AI identification with visible confidence.',
    icon: ScanSearch,
  },
  {
    label: 'Diagnose Crop Damage',
    to: '/damage-detective',
    description: 'Describe the symptoms to pinpoint the pest behind the damage.',
    icon: Stethoscope,
  },
  {
    label: 'Explore the Museum',
    to: '/museum',
    description: 'Browse the digital collection by order, family or crop.',
    icon: Bug,
  },
  {
    label: 'Ask EntomoAI',
    to: '/assistant',
    description: 'Conversational answers grounded in verified entomology.',
    icon: BookOpen,
  },
] as const

const howItWorks = [
  { step: 'Upload', description: 'Share an insect or damage photo plus crop context.' },
  { step: 'Analyze', description: 'AI examines morphology, crop association and symptoms.' },
  { step: 'Identify', description: 'Review ranked candidates with transparent model confidence.' },
  { step: 'Understand', description: 'Read verified species profiles and life-cycle details.' },
  { step: 'Monitor', description: 'Record observations and follow IPM guidance.' },
] as const

const beneficialCategories = [
  { title: 'Predators', description: 'Ladybirds, lacewings and predatory bugs that hunt pests.' },
  { title: 'Parasitoids', description: 'Wasps and flies whose larvae develop on pest insects.' },
  { title: 'Pollinators', description: 'Bees, butterflies and hoverflies that sustain crops.' },
] as const

export function HomePage() {
  const featuredQuery = useQuery({
    queryKey: ['museum', { featured: true }],
    queryFn: () => fetchInsectList({ featured: true, pageSize: 4 }),
    enabled: isSupabaseConfigured,
  })

  return (
    <>
      {/* Hero */}
      <section className="border-b border-forest-100 bg-cream-100/50">
        <div className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge tone="leaf" className="mb-5">
              AI-Powered Entomology Platform
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-forest-900 sm:text-5xl lg:text-6xl">
              Explore the hidden world of insects.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
              AI-powered insect identification, pest diagnosis, taxonomy, life-cycle exploration
              and entomology intelligence for farmers, students, researchers and entomologists.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/identify">
                <Button size="lg" className="w-full sm:w-auto">
                  <ScanSearch className="h-5 w-5" aria-hidden="true" />
                  Identify an Insect
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/museum">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Explore Insect Museum
                </Button>
              </Link>
            </div>
            <p className="mt-6 max-w-md text-sm text-ink-400">
              Identification results are AI-assisted, evidence-based and clearly communicate
              uncertainty — never a false certainty.
            </p>
          </div>
          <div className="relative hidden justify-center lg:flex">
            <HeroIllustration />
            <div className="pointer-events-none absolute -left-2 top-6 text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">
                Order
              </span>
              <span className="mt-0.5 block font-serif text-base font-semibold text-forest-900">
                Lepidoptera
              </span>
              <span className="mt-2 ml-auto block h-px w-10 bg-forest-200" aria-hidden="true" />
            </div>
            <div className="pointer-events-none absolute -right-2 top-12 text-left">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">
                Family
              </span>
              <span className="mt-0.5 block font-serif text-base font-semibold text-forest-900">
                Noctuidae
              </span>
              <span className="mt-2 block h-px w-10 bg-forest-200" aria-hidden="true" />
            </div>
            <div className="pointer-events-none absolute -right-2 bottom-24 text-left">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">
                Host crops
              </span>
              <span className="mt-0.5 block font-serif text-base font-semibold text-forest-900">
                Cotton · Maize
              </span>
              <span className="mt-2 block h-px w-10 bg-forest-200" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured specimens */}
      <section className="border-b border-forest-100 bg-cream-100/50 py-16 md:py-20">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf-700">
                Collection highlights
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-forest-900 sm:text-4xl">
                Featured Specimens
              </h2>
              <p className="mt-2 max-w-xl text-ink-400">
                A glimpse of the digital collection — verified profiles with taxonomy, crop
                relationships and management guidance.
              </p>
            </div>
            <Link
              to="/museum"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
            >
              View the full collection <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {featuredQuery.isLoading ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-xl bg-cream-200/80" />
              ))}
            </div>
          ) : (
            <div className="mt-10 flex snap-x gap-5 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0 md:grid-cols-4">
              {(featuredQuery.data?.items ?? []).map((insect) => (
                <div key={insect.id} className="w-64 shrink-0 snap-start overflow-hidden rounded-xl sm:w-auto">
                  <InsectCard insect={insect} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="container-page py-16">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf-700">
              Tools of the trade
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-forest-900 sm:text-4xl">
              Start exploring
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-400">
            Four tools cover the full workflow — identify, diagnose, collect and understand.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-forest-100 bg-forest-100 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col bg-cream-50 p-6 transition-colors hover:bg-white"
              >
                <div className="flex items-start justify-between">
                  <span className="font-serif text-lg font-semibold text-leaf-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="h-5 w-5 text-forest-300 transition-colors group-hover:text-forest-500" aria-hidden="true" />
                </div>
                <h3 className="mt-10 font-serif text-xl font-semibold text-forest-900 group-hover:underline group-hover:decoration-forest-300 group-hover:underline-offset-4">
                  {action.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{action.description}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-700">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-ink-300">
          Prefer a guided path? Try the{' '}
          <Link to="/identification-key" className="font-medium text-forest-700 underline-offset-2 hover:text-forest-900 hover:underline">
            step-by-step identification key
          </Link>
          .
        </p>
      </section>

      {/* Explore by crop */}
      <section className="border-y border-forest-100 bg-forest-800 py-16 text-cream-50">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-semibold text-cream-50">Explore by crop</h2>
              <p className="mt-2 max-w-lg text-cream-200/80">
                Crop–pest relationships with damage symptoms, life cycles and management guidance.
              </p>
            </div>
            <Link
              to="/crops"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-300 hover:text-leaf-200"
            >
              View all crops <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {FEATURED_CROPS.map((crop) => (
              <Link
                key={crop}
                to={`/crops?name=${encodeURIComponent(crop)}`}
                className="inline-flex items-center gap-2 rounded-full border border-forest-700 bg-forest-900/50 px-5 py-2.5 text-sm font-medium text-cream-100 transition-colors hover:border-leaf-500 hover:text-white"
              >
                <Leaf className="h-4 w-4 text-leaf-400" aria-hidden="true" />
                {crop}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-semibold">How EntomoLens works</h2>
          <p className="mx-auto mt-2 max-w-2xl text-ink-400">
            An image is only the start. EntomoLens combines your photo with crop, damage, location
            and entomology knowledge for a transparent, evidence-based result.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-5">
          {howItWorks.map((item, index) => (
            <li
              key={item.step}
              className="relative rounded-xl border border-forest-100 bg-white p-5 shadow-card"
            >
              <span className="font-serif text-2xl font-semibold text-leaf-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-serif text-lg font-semibold text-forest-900">{item.step}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Beneficial insects */}
      <section className="border-y border-forest-100 bg-cream-100/50 py-16">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-semibold">Beneficial insects</h2>
              <p className="mt-2 max-w-lg text-ink-400">
                The allies of agriculture — predators, parasitoids and pollinators.
              </p>
            </div>
            <Link
              to="/beneficial-insects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-800"
            >
              Explore beneficials <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {beneficialCategories.map((category) => (
              <div key={category.title} className="rounded-xl border border-forest-100 bg-white p-6 shadow-card">
                <Binoculars className="h-6 w-6 text-leaf-600" aria-hidden="true" />
                <h3 className="mt-3 font-serif text-lg font-semibold text-forest-900">{category.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education + research */}
      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-forest-100 bg-white p-8 shadow-card">
            <GraduationCap className="h-7 w-7 text-forest-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">For students</h2>
            <p className="mt-2 leading-relaxed text-ink-400">
              Study taxonomy, life cycles and identification through an interactive key, quizzes and
              a rich digital museum. Ask EntomoAI for explanations as you explore.
            </p>
            <Link to="/quiz">
              <Button variant="secondary" className="mt-6">
                Start learning <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-forest-100 bg-white p-8 shadow-card">
            <FlaskConical className="h-7 w-7 text-forest-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">For researchers</h2>
            <p className="mt-2 leading-relaxed text-ink-400">
              Record field observations, organize them into research projects, view geographic
              patterns and export datasets for analysis.
            </p>
            <Link to="/observations">
              <Button variant="secondary" className="mt-6">
                Field observations <MapPin className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}