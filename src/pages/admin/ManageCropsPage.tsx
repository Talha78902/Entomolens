import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EntityCrud, type EntityColumn } from '@/components/admin/EntityCrud'
import {
  createCropAdmin,
  deleteCropAdmin,
  fetchAdminCrops,
  updateCropAdmin,
} from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/EmptyState'

const COLUMNS: EntityColumn[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'scientific_name', label: 'Scientific name' },
]

export function ManageCropsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'crops'], queryFn: fetchAdminCrops })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'crops'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: Record<string, string> }) =>
      id
        ? updateCropAdmin(id, { name: values.name ?? '', scientific_name: values.scientific_name || null })
        : createCropAdmin({ name: values.name ?? '', scientific_name: values.scientific_name || null }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCropAdmin(id),
    onSuccess: invalidate,
  })

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to manage crops." />
      </div>
    )
  }

  return (
    <EntityCrud
      title="Manage crops"
      subtitle="Add and edit host crops shown across the app."
      columns={COLUMNS}
      rows={(query.data ?? []).map((crop) => ({
        id: crop.id,
        name: crop.name,
        scientific_name: crop.scientific_name ?? '',
      }))}
      loading={query.isLoading}
      rowLabel={(row) => (row as { name?: string }).name ?? row.id}
      onSave={(id, values) => saveMutation.mutateAsync({ id, values })}
      onDelete={(id) => deleteMutation.mutateAsync(id)}
      busy={saveMutation.isPending || deleteMutation.isPending}
    />
  )
}