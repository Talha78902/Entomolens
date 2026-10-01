import { tryGetSupabase } from '@/lib/supabase/client'

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived'

export interface ResearchProject {
  id: string
  created_at: string
  updated_at?: string | null
  user_id: string
  title: string
  description?: string | null
  start_date: string
  end_date?: string | null
  status: ProjectStatus
  observations?: Array<{ observation_id: string }>
}

export interface ProjectObservationLink {
  id: string
  project_id: string
  observation_id: string
  added_at: string
}

export interface ProjectInput {
  title: string
  description?: string | null
  start_date: string
  end_date?: string | null
  status: ProjectStatus
}

export async function fetchProjects(userId: string): Promise<ResearchProject[]> {
  const supabase = tryGetSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('research_projects')
    .select(`*, observations:research_project_observations(observation_id)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ResearchProject[]
}

export async function fetchProject(
  userId: string,
  projectId: string,
): Promise<ResearchProject | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('research_projects')
    .select(`*, observations:research_project_observations(observation_id)`)
    .eq('user_id', userId)
    .eq('id', projectId)
    .maybeSingle()
  return (data as ResearchProject | null) ?? null
}

export async function createProject(input: ProjectInput): Promise<string | null> {
  const supabase = tryGetSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('research_projects')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description || null,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return (data as { id: string }).id
}

export async function updateProject(
  userId: string,
  projectId: string,
  patch: Partial<ProjectInput>,
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('research_projects')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description || null } : {}),
      ...(patch.start_date !== undefined ? { start_date: patch.start_date } : {}),
      ...(patch.end_date !== undefined ? { end_date: patch.end_date || null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
  return !error
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  await supabase.from('research_project_observations').delete().eq('project_id', projectId)
  const { error } = await supabase
    .from('research_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)
  return !error
}

export async function addObservationToProject(
  userId: string,
  projectId: string,
  observationId: string,
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { data: observation } = await supabase
    .from('observations')
    .select('id')
    .eq('id', observationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!observation) return false
  const { error } = await supabase
    .from('research_project_observations')
    .insert({ project_id: projectId, observation_id: observationId })
  return !error
}

export async function removeObservationFromProject(
  projectId: string,
  observationId: string,
): Promise<boolean> {
  const supabase = tryGetSupabase()
  if (!supabase) return false
  const { error } = await supabase
    .from('research_project_observations')
    .delete()
    .eq('project_id', projectId)
    .eq('observation_id', observationId)
  return !error
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

export function projectStatusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function exportObservationsCsv(
  observations: Array<{
    observed_on?: string | null
    location_name?: string | null
    life_stage?: string | null
    quantity?: number | null
    damage_level?: number | null
    notes?: string | null
    visibility?: string | null
    insects?: { common_name?: string | null; scientific_name?: string | null } | null
    crops?: { name?: string | null } | null
  }>,
): void {
  const headers = [
    'Date',
    'Species common name',
    'Species scientific name',
    'Crop',
    'Location',
    'Life stage',
    'Quantity',
    'Damage level',
    'Visibility',
    'Notes',
  ]
  const escapeCell = (value: string | number | null | undefined): string => {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }
  const rows = observations.map((observation) =>
    [
      observation.observed_on?.slice(0, 10) ?? '',
      observation.insects?.common_name ?? '',
      observation.insects?.scientific_name ?? '',
      observation.crops?.name ?? '',
      observation.location_name ?? '',
      observation.life_stage ?? '',
      observation.quantity ?? '',
      observation.damage_level ?? '',
      observation.visibility ?? '',
      observation.notes ?? '',
    ]
      .map(escapeCell)
      .join(','),
  )
  const csv = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `entomolens-research-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}