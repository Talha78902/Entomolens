export const APP_NAME = 'EntomoLens'

export const NAV_LINKS = [
  { label: 'Search', to: '/search' },
  { label: 'Identify', to: '/identify' },
  { label: 'Museum', to: '/museum' },
  { label: 'Crops', to: '/crops' },
  { label: 'Life Cycles', to: '/life-cycles' },
  { label: 'Beneficial Insects', to: '/beneficial-insects' },
  { label: 'Identification Key', to: '/identification-key' },
] as const

export const DASHBOARD_LINKS = [
  { label: 'Dashboard', to: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Search', to: '/search', icon: 'search' },
  { label: 'Identify', to: '/identify', icon: 'scan-search' },
  { label: 'Damage Detective', to: '/damage-detective', icon: 'stethoscope' },
  { label: 'History', to: '/history', icon: 'history' },
  { label: 'Favorites', to: '/favorites', icon: 'bookmark' },
  { label: 'Observations', to: '/observations', icon: 'binoculars' },
  { label: 'Map', to: '/map', icon: 'map' },
  { label: 'Research', to: '/research', icon: 'flask-conical' },
  { label: 'Assistants', to: '/assistant', icon: 'bot' },
  { label: 'Quiz', to: '/quiz', icon: 'graduation-cap' },
] as const

export const FEATURED_CROPS = [
  'Cotton',
  'Wheat',
  'Maize',
  'Rice',
  'Tomato',
  'Okra',
  'Chickpea',
] as const

export const DEFAULT_PAGE_SIZE = 24

export const AI_MODEL_CONFIDENCE_DISCLAIMER =
  'Model confidence reflects the AI analysis only and is not a scientifically validated probability of species identity.'

export const ENTOMOSCORE_DISCLAIMER =
  'EntomoScore summarizes available evidence and is not a scientifically validated probability of species identity.'