import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EntityCrud, type EntityColumn } from '@/components/admin/EntityCrud'
import {
  deleteInsectAdmin,
  fetchAdminInsects,
  setInsectFeatured,
  setInsectStatus,
} from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/EmptyState'

const COLUMNS: EntityColumn[] = [
  { key: 'common_name', label: 'Common name' },
  { key: 'scientific_name', label: 'Scientific name' },
  {
    key: 'verification_status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'reviewed', label: 'Reviewed' },
      { value: 'verified', label: 'Verified' },
    ],
  },
  {
    key: 'featured',
    label: 'Featured',
    type: 'select',
    options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ],
  },
]

export function ManageInsectsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'insects'], queryFn: fetchAdminInsects })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'insects'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: Record<string, string> }) => {
      if (!id) return false
      await setInsectStatus(id, values.verification_status as 'draft' | 'reviewed' | 'verified')
      await setInsectFeatured(id, values.featured === 'true')
      return true
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInsectAdmin(id),
    onSuccess: invalidate,
  })

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to manage insects." />
      </div>
    )
  }

  return (
    <EntityCrud
      title="Manage insects"
      subtitle="Set verification status (draft / reviewed / verified) and feature species."
      columns={COLUMNS}
      rows={(query.data ?? []).map((insect) => ({
        id: insect.id,
        common_name: insect.common_name,
        scientific_name: insect.scientific_name,
        verification_status: insect.verification_status,
        featured: String(insect.featured),
      }))}
      loading={query.isLoading}
      rowLabel={(row) => (row as { common_name?: string }).common_name ?? row.id}
      onSave={(id, values) => saveMutation.mutateAsync({ id, values })}
      onDelete={(id) => deleteMutation.mutateAsync(id)}
      busy={saveMutation.isPending || deleteMutation.isPending}
    />
  )
}