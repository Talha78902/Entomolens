import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils/cn'

const fieldBase =
  'w-full rounded-lg border border-forest-200 bg-white px-3 text-sm text-ink-800 shadow-sm transition-colors placeholder:text-ink-300 hover:border-forest-300 focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/30 disabled:cursor-not-allowed disabled:bg-cream-100'

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-ink-700', className)}>
      {children}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, 'h-10 pr-8', className)} {...props} />
}

export interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  htmlFor?: string
  children: React.ReactNode
}

export function Field({ label, hint, error, htmlFor, children }: FieldProps) {
  const autoId = useId()
  const fieldId = htmlFor ?? autoId
  return (
    <div>
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}