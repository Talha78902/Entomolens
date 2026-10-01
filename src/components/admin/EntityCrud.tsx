import { useMemo, useState } from 'react'
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'

export interface EntityColumn {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select'
  options?: Array<{ value: string; label: string }>
  required?: boolean
  className?: string
}

interface EntityCrudProps<T extends { id: string }> {
  title: string
  subtitle?: string
  columns: EntityColumn[]
  rows: T[]
  loading?: boolean
  rowLabel?: (row: T) => string
  onSave?: (id: string | null, values: Record<string, string>) => Promise<boolean> | boolean
  onDelete?: (id: string) => Promise<boolean> | boolean
  busy?: boolean
}

export function EntityCrud<T extends { id: string }>({
  title,
  subtitle,
  columns,
  rows,
  loading,
  rowLabel,
  onSave,
  onDelete,
  busy,
}: EntityCrudProps<T>) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      Object.values(row)
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [rows, query])

  const startCreate = () => {
    setCreating(true)
    setEditingId(null)
    setConfirmDelete(null)
    const initial: Record<string, string> = {}
    for (const column of columns) initial[column.key] = ''
    setValues(initial)
  }

  const startEdit = (row: T) => {
    setEditingId(row.id)
    setCreating(false)
    setConfirmDelete(null)
    const initial: Record<string, string> = {}
    for (const column of columns) {
      initial[column.key] = row[column.key as keyof T] != null ? String(row[column.key as keyof T]) : ''
    }
    setValues(initial)
  }

  const cancelForm = () => {
    setCreating(false)
    setEditingId(null)
  }

  const submit = async () => {
    if (!onSave) return
    const missing = columns.some((column) => column.required && !values[column.key]?.trim())
    if (missing) return
    const ok = await onSave(creating ? null : editingId, values)
    if (ok) cancelForm()
  }

  const formOpen = creating || editingId !== null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-semibold text-forest-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
        </div>
        <Button onClick={startCreate} disabled={!onSave}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add new
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold text-forest-900">
                {creating ? 'Add new' : 'Edit'}
              </h2>
              <button
                onClick={cancelForm}
                className="rounded p-1 text-ink-400 hover:bg-forest-50"
                aria-label="Close form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {columns.map((column) => (
                <label key={column.key} className={cn('block', column.type === 'textarea' && 'md:col-span-2')}>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
                    {column.label}
                    {column.required ? ' *' : ''}
                  </span>
                  {column.type === 'select' ? (
                    <select
                      value={values[column.key] ?? ''}
                      onChange={(event) => setValues({ ...values, [column.key]: event.target.value })}
                      className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                    >
                      <option value="">Select…</option>
                      {column.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : column.type === 'textarea' ? (
                    <textarea
                      value={values[column.key] ?? ''}
                      onChange={(event) => setValues({ ...values, [column.key]: event.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-forest-200 bg-white px-3 py-2 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                    />
                  ) : (
                    <input
                      type={column.type === 'number' ? 'number' : 'text'}
                      value={values[column.key] ?? ''}
                      onChange={(event) => setValues({ ...values, [column.key]: event.target.value })}
                      className="h-10 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5">
              <Button onClick={submit} disabled={busy}>
                <Save className="h-4 w-4" aria-hidden="true" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search…"
          className="h-10 w-full rounded-lg border border-forest-200 bg-white pl-9 pr-3 text-sm text-forest-900 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        />
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-forest-100 bg-white shadow-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-forest-100 bg-cream-100/60 text-xs uppercase tracking-wide text-ink-400">
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-medium">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-300">
                    No records found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-forest-50 last:border-0 hover:bg-cream-50/60">
                    {columns.map((column) => {
                      const value = row[column.key as keyof T]
                      if (column.type === 'select' && column.options) {
                        const option = column.options.find((item) => item.value === String(value))
                        return (
                          <td key={column.key} className="px-4 py-3 text-forest-900">
                            {option ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                  option.value === 'verified'
                                    ? 'bg-leaf-100 text-leaf-700'
                                    : option.value === 'reviewed'
                                      ? 'bg-amber-100 text-amber-700'
                                      : option.value === 'draft'
                                        ? 'bg-forest-100 text-forest-700'
                                        : option.value === 'approved'
                                          ? 'bg-leaf-100 text-leaf-700'
                                          : option.value === 'rejected'
                                            ? 'bg-red-100 text-red-700'
                                            : option.value === 'pending'
                                              ? 'bg-amber-100 text-amber-700'
                                              : 'bg-forest-100 text-forest-700',
                                )}
                              >
                                {option.label}
                              </span>
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                        )
                      }
                      return (
                        <td key={column.key} className="px-4 py-3 text-forest-900">
                          {value != null && value !== '' ? String(value) : <span className="text-ink-300">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {onSave && (
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded p-1.5 text-ink-400 transition-colors hover:bg-forest-100 hover:text-forest-900"
                            aria-label={`Edit ${rowLabel ? rowLabel(row) : row.id}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {onDelete &&
                          (confirmDelete === row.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  await onDelete(row.id)
                                  setConfirmDelete(null)
                                }}
                                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="rounded bg-forest-100 px-2 py-1 text-xs font-medium text-forest-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(row.id)}
                              className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${rowLabel ? rowLabel(row) : row.id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}