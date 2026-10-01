import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EntityCrud, type EntityColumn } from '@/components/admin/EntityCrud'
import {
  createReferenceAdmin,
  deleteReferenceAdmin,
  fetchAdminReferences,
  updateReferenceAdmin,
} from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/EmptyState'

const COLUMNS: EntityColumn[] = [
  { key: 'title', label: 'Title', required: true },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'journal', label: 'Journal' },
]

export function ManageReferencesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'references'], queryFn: fetchAdminReferences })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'references'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: Record<string, string> }) => {
      const input = {
        title: values.title ?? '',
        authors: values.authors || null,
        year: values.year ? Number(values.year) : null,
        journal: values.journal || null,
      }
      return id ? updateReferenceAdmin(id, input) : createReferenceAdmin(input)
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReferenceAdmin(id),
    onSuccess: invalidate,
  })

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to manage references." />
      </div>
    )
  }

  return (
    <EntityCrud
      title="Manage references"
      subtitle="Scientific citations shown on insect profiles."
      columns={COLUMNS}
      rows={(query.data ?? []).map((reference) => ({
        id: reference.id,
        title: reference.title,
        authors: reference.authors ?? '',
        year: reference.year != null ? String(reference.year) : '',
        journal: reference.journal ?? '',
      }))}
      loading={query.isLoading}
      rowLabel={(row) => row.title as string}
      onSave={(id, values) => saveMutation.mutateAsync({ id, values })}
      onDelete={(id) => deleteMutation.mutateAsync(id)}
      busy={saveMutation.isPending || deleteMutation.isPending}
    />
  )
}