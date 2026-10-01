import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  createProject,
  deleteProject,
  fetchProjects,
  projectStatusLabel,
  updateProject,
  type ProjectStatus,
  type ResearchProject,
} from '@/services/research'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'

interface FormState {
  title: string
  description: string
  start_date: string
  end_date: string
  status: ProjectStatus
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  status: 'planned',
})

const STATUS_COLORS: Record<ProjectStatus, 'leaf' | 'red' | 'neutral' | 'amber'> = {
  planned: 'amber',
  active: 'leaf',
  completed: 'neutral',
  archived: 'red',
}

function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial: FormState
  onSubmit: (form: FormState) => void
  onCancel?: () => void
  busy?: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Title *
        </span>
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="e.g. Cotton Pest Monitoring 2026"
          className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Description
        </span>
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={3}
          placeholder="Project goals and scope"
          className="w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Start date *
        </span>
        <input
          type="date"
          value={form.start_date}
          onChange={(event) => setForm({ ...form, start_date: event.target.value })}
          className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          End date
        </span>
        <input
          type="date"
          value={form.end_date}
          onChange={(event) => setForm({ ...form, end_date: event.target.value })}
          className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Status
        </span>
        <select
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}
          className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        >
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <div className="flex items-end gap-3 md:col-span-2">
        <Button onClick={() => onSubmit(form)} disabled={!form.title || busy}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Save project
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

export function ResearchPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ResearchProject | null>(null)

  const query = useQuery({
    queryKey: ['research-projects', user?.id],
    queryFn: () => fetchProjects(user?.id ?? ''),
    enabled: Boolean(user) && isSupabaseConfigured,
  })

  const createMutation = useMutation({
    mutationFn: async (form: FormState) => {
      const id = await createProject({
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
      })
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] })
      setCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (form: FormState) =>
      updateProject(user?.id ?? '', editing?.id ?? '', {
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(user?.id ?? '', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] })
    },
  })

  if (!user) return null

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Database not configured"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to create research projects."
        />
      </div>
    )
  }

  return (
    <div className="min-h-[60vh]">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-forest-900">Research mode</h1>
          <p className="mt-1 text-sm text-ink-400">
            Organize field observations into monitoring projects and export datasets.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New project
        </Button>
      </header>

      {(creating || editing) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editing ? 'Edit project' : 'New research project'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm
              initial={
                editing
                  ? {
                      title: editing.title,
                      description: editing.description ?? '',
                      start_date: editing.start_date.slice(0, 10),
                      end_date: editing.end_date?.slice(0, 10) ?? '',
                      status: editing.status,
                    }
                  : emptyForm()
              }
              busy={createMutation.isPending || updateMutation.isPending}
              onSubmit={(form) => {
                if (editing) updateMutation.mutate(form)
                else createMutation.mutate(form)
              }}
              onCancel={() => {
                setCreating(false)
                setEditing(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      {query.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          title="No research projects"
          description="Create a project like “Cotton Pest Monitoring 2026” to organize observations."
        />
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(query.data ?? []).map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge tone={STATUS_COLORS[project.status]}>{projectStatusLabel(project.status)}</Badge>
                  <span className="text-xs text-ink-400">
                    {project.observations?.length ?? 0} observation
                    {project.observations?.length === 1 ? '' : 's'}
                  </span>
                </div>
                <h2 className="font-serif text-lg font-semibold text-forest-900">{project.title}</h2>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-400">{project.description}</p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {project.start_date.slice(0, 10)}
                  {project.end_date && ` → ${project.end_date.slice(0, 10)}`}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/research/${project.id}`)}>
                    <FolderKanban className="h-4 w-4" aria-hidden="true" /> Open
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      setEditing(project)
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(project.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}