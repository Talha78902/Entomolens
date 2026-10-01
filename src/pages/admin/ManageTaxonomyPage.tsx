import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EntityCrud, type EntityColumn } from '@/components/admin/EntityCrud'
import {
  createFamilyAdmin,
  createGenusAdmin,
  createOrderAdmin,
  deleteTaxonomyAdmin,
  fetchTaxonomyAdmin,
  updateFamilyAdmin,
  updateGenusAdmin,
  updateOrderAdmin,
} from '@/services/admin'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/EmptyState'

export function ManageTaxonomyPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'taxonomy'], queryFn: fetchTaxonomyAdmin })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'taxonomy'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: Record<string, string> }) => {
      if (values.parent === 'order' || (id == null && values.parent_id == null)) {
        if (id) {
          return updateOrderAdmin(id, { name: values.name ?? '', description: values.description || null })
        }
        return createOrderAdmin({ name: values.name ?? '', description: values.description || null })
      }
      if (values.parent === 'family') {
        if (id) {
          return updateFamilyAdmin(id, {
            order_id: values.parent_id ?? '',
            name: values.name ?? '',
            description: values.description || null,
          })
        }
        return createFamilyAdmin({
          order_id: values.parent_id ?? '',
          name: values.name ?? '',
          description: values.description || null,
        })
      }
      if (id) {
        return updateGenusAdmin(id, {
          family_id: values.parent_id ?? '',
          name: values.name ?? '',
          description: values.description || null,
        })
      }
      return createGenusAdmin({
        family_id: values.parent_id ?? '',
        name: values.name ?? '',
        description: values.description || null,
      })
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: ({ table, id }: { table: 'orders' | 'families' | 'genera'; id: string }) =>
      deleteTaxonomyAdmin(table, id),
    onSuccess: invalidate,
  })

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Database not configured" description="Configure Supabase to manage taxonomy." />
      </div>
    )
  }

  const taxonomy = query.data ?? { orders: [], families: [], genera: [] }

  const orderColumns: EntityColumn[] = [
    { key: 'parent', label: 'Add as', type: 'select', options: [{ value: 'order', label: 'Order' }] },
    { key: 'name', label: 'Order name', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]
  const familyColumns: EntityColumn[] = [
    { key: 'parent', label: 'Add as', type: 'select', options: [{ value: 'family', label: 'Family' }] },
    {
      key: 'parent_id',
      label: 'Order',
      type: 'select',
      options: taxonomy.orders.map((order) => ({ value: order.id, label: order.name })),
    },
    { key: 'name', label: 'Family name', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]
  const genusColumns: EntityColumn[] = [
    { key: 'parent', label: 'Add as', type: 'select', options: [{ value: 'genus', label: 'Genus' }] },
    {
      key: 'parent_id',
      label: 'Family',
      type: 'select',
      options: taxonomy.families.map((family) => ({ value: family.id, label: family.name })),
    },
    { key: 'name', label: 'Genus name', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]

  return (
    <div className="space-y-10">
      <EntityCrud
        title="Orders"
        subtitle="Broadest level of the taxonomy hierarchy."
        columns={orderColumns}
        rows={taxonomy.orders.map((order) => ({
          id: order.id,
          parent: '',
          name: order.name,
          description: order.description ?? '',
        }))}
        loading={query.isLoading}
        onSave={(id, values) =>
          saveMutation.mutateAsync({ id, values: { ...values, parent: id ? '' : 'order' } })
        }
        onDelete={(id) => deleteMutation.mutateAsync({ table: 'orders', id })}
        busy={saveMutation.isPending || deleteMutation.isPending}
      />
      <EntityCrud
        title="Families"
        subtitle="Families belong to an order."
        columns={familyColumns}
        rows={taxonomy.families.map((family) => ({
          id: family.id,
          parent: '',
          parent_id: family.order_id,
          name: family.name,
          description: family.description ?? '',
        }))}
        loading={query.isLoading}
        onSave={(id, values) =>
          saveMutation.mutateAsync({ id, values: { ...values, parent: id ? '' : 'family' } })
        }
        onDelete={(id) => deleteMutation.mutateAsync({ table: 'families', id })}
        busy={saveMutation.isPending || deleteMutation.isPending}
      />
      <EntityCrud
        title="Genera"
        subtitle="Genera belong to a family."
        columns={genusColumns}
        rows={taxonomy.genera.map((genus) => ({
          id: genus.id,
          parent: '',
          parent_id: genus.family_id,
          name: genus.name,
          description: genus.description ?? '',
        }))}
        loading={query.isLoading}
        onSave={(id, values) =>
          saveMutation.mutateAsync({ id, values: { ...values, parent: id ? '' : 'genus' } })
        }
        onDelete={(id) => deleteMutation.mutateAsync({ table: 'genera', id })}
        busy={saveMutation.isPending || deleteMutation.isPending}
      />
    </div>
  )
}