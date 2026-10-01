export type Role = 'student' | 'farmer' | 'researcher' | 'entomologist' | 'admin'

export type VerificationStatus = 'draft' | 'reviewed' | 'verified'

export type Visibility = 'private' | 'public'

export type UserRole = Role

// --------------------------------------------------------------------------
// Core knowledge
// --------------------------------------------------------------------------

export interface Profile {
  id: string
  created_at: string
  updated_at?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role: Role
  institution?: string | null
  region?: string | null
}

export interface TaxonomicOrder {
  id: string
  created_at: string
  updated_at?: string | null
  name: string
  common_name?: string | null
  description?: string | null
}

export interface TaxonomicFamily {
  id: string
  created_at: string
  updated_at?: string | null
  name: string
  common_name?: string | null
  description?: string | null
  order_id: string
}

export interface TaxonomicGenus {
  id: string
  created_at: string
  updated_at?: string | null
  name: string
  description?: string | null
  family_id: string
}

export interface Insect {
  id: string
  created_at: string
  updated_at?: string | null
  scientific_name: string
  common_name: string
  genus_id: string
  family_id: string
  order_id: string
  description: string
  identification_characteristics?: string | null
  images?: string[] | null
  is_pest: boolean
  is_beneficial: boolean
  beneficial_category?: string | null
  native_region?: string | null
  verification_status: VerificationStatus
  featured?: boolean
}

export interface Crop {
  id: string
  created_at: string
  updated_at?: string | null
  name: string
  scientific_name?: string | null
  description?: string | null
  image_url?: string | null
  region?: string | null
}

export interface CropInsect {
  id: string
  created_at: string
  crop_id: string
  insect_id: string
  relationship_type: 'pest' | 'beneficial'
  severity?: 'major' | 'minor' | 'occasional' | null
  notes?: string | null
}

export interface DamageSymptom {
  id: string
  created_at: string
  name: string
  category: 'chewing' | 'piercing-sucking' | 'mining' | 'boring' | 'skeletonization' | 'webbing' | 'curling' | 'wilting' | 'fruit-damage' | 'other'
  description?: string | null
}

export interface InsectDamageSymptom {
  id: string
  created_at: string
  insect_id: string
  symptom_id: string
  description?: string | null
  severity?: string | null
}

export interface LifeCycleStage {
  id: string
  created_at: string
  insect_id: string
  stage_order: number
  stage_name: 'egg' | 'larva' | 'nymph' | 'pupa' | 'adult'
  duration?: string | null
  appearance?: string | null
  feeding_behavior?: string | null
  damage_description?: string | null
  identification_characteristics?: string | null
  image_url?: string | null
}

export interface NaturalEnemyRelationship {
  id: string
  created_at: string
  pest_insect_id: string
  enemy_insect_id: string
  relationship: 'predator' | 'parasitoid' | 'pathogen'
  notes?: string | null
}

export interface ManagementMethod {
  id: string
  created_at: string
  name: string
  category: 'monitoring' | 'cultural' | 'mechanical' | 'physical' | 'biological' | 'chemical'
  description?: string | null
}

export interface InsectManagement {
  id: string
  created_at: string
  insect_id: string
  method_id: string
  notes?: string | null
  source_id?: string | null
}

export interface Reference {
  id: string
  created_at: string
  updated_at?: string | null
  title: string
  authors?: string[] | null
  year?: number | null
  journal?: string | null
  doi?: string | null
  url?: string | null
  source_type: 'journal' | 'book' | 'report' | 'website' | 'database' | 'other'
}

export interface InsectReference {
  id: string
  created_at: string
  insect_id: string
  reference_id: string
}

// --------------------------------------------------------------------------
// User activity
// --------------------------------------------------------------------------

export interface Identification {
  id: string
  created_at: string
  user_id: string
  image_path?: string | null
  crop_id?: string | null
  location_name?: string | null
  notes?: string | null
  status: 'pending' | 'completed' | 'failed'
  model_name?: string | null
  result_summary?: string | null
  top_insect_id?: string | null
}

export interface IdentificationCandidate {
  id: string
  created_at: string
  identification_id: string
  insect_id: string
  rank: number
  confidence: number
  confidence_label?: string | null
}

export interface IdentificationEvidence {
  id: string
  created_at: string
  identification_id: string
  image_evidence: number
  crop_evidence: number
  symptom_evidence: number
  observation_evidence: number
  overall_evidence: number
  notes?: string | null
}

export interface AiConversation {
  id: string
  created_at: string
  user_id: string
  title?: string | null
  context_insect_id?: string | null
}

export interface AiMessage {
  id: string
  created_at: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: unknown[] | null
}

export interface FavoriteInsect {
  id: string
  created_at: string
  user_id: string
  insect_id: string
}

export interface Location {
  id: string
  created_at: string
  name?: string | null
  latitude: number
  longitude: number
  region?: string | null
  country?: string | null
}

export interface Observation {
  id: string
  created_at: string
  updated_at?: string | null
  user_id: string
  insect_id: string
  crop_id?: string | null
  location_id?: string | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  observed_on: string
  image_path?: string | null
  life_stage?: string | null
  quantity?: number | null
  damage_level?: number | null
  notes?: string | null
  visibility: Visibility
}

export interface ResearchProject {
  id: string
  created_at: string
  updated_at?: string | null
  user_id: string
  title: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status: 'active' | 'completed' | 'archived'
}

export interface ResearchProjectObservation {
  id: string
  created_at: string
  project_id: string
  observation_id: string
}

// --------------------------------------------------------------------------
// Education
// --------------------------------------------------------------------------

export interface Quiz {
  id: string
  created_at: string
  title: string
  category: 'taxonomy' | 'pest-identification' | 'beneficial-insects' | 'life-cycles' | 'crop-pests' | 'ipm'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  description?: string | null
}

export interface QuizQuestion {
  id: string
  created_at: string
  quiz_id: string
  question: string
  explanation?: string | null
  order: number
}

export interface QuizOption {
  id: string
  created_at: string
  question_id: string
  option_text: string
  is_correct: boolean
  order: number
}

export interface QuizAttempt {
  id: string
  created_at: string
  quiz_id: string
  user_id: string
  score: number
  total_questions: number
  correct_answers: number
  wrong_answers: number
  completed_at?: string | null
}

// --------------------------------------------------------------------------
// API-facing result shapes
// --------------------------------------------------------------------------

export interface IdentificationResult {
  candidates: Array<{
    insectId?: string
    commonName: string
    scientificName: string
    rank: number
    confidence: number
    confidenceLabel: string
    matchedCrops?: string[]
    reasoning?: string
    order?: string | null
    family?: string | null
  }>
  entomoScore: {
    image: number
    crop: number
    symptom: number
    observation: number
    overall: number
  }
  summary: string
  disclaimer: string
  modelName: string
  visionUnavailable?: boolean
}

export interface DamageAnalysisResult {
  observedSymptoms: string[]
  possibleGroups: string[]
  candidates: Array<{
    scientificName: string
    commonName: string
    reasoning: string
  }>
  additionalObservations: string[]
  ipmAdvice: string[]
  disclaimer: string
  visionUnavailable?: boolean
  modelName?: string
}