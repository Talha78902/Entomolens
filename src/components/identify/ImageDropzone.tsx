import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

interface ImageDropzoneProps {
  value: File | null
  previewUrl: string | null
  onChange: (file: File | null) => void
  /**
   * Surfaced when a dropped/picked file cannot be used. Without this the zone
   * simply ignored anything that was not an image, so selecting a .heic or a
   * PDF looked like the app was broken.
   */
  onError?: (message: string | null) => void
  className?: string
}

export function ImageDropzone({
  value,
  previewUrl,
  onChange,
  onError,
  className,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        onError?.(`"${file.name}" is not an image. Choose a JPEG, PNG or WebP file.`)
        return
      }
      onError?.(null)
      onChange(file)
    },
    [onChange, onError],
  )

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      {value && previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-forest-100 bg-cream-50">
          <img src={previewUrl} alt="Specimen preview" className="max-h-80 w-full object-contain" />
          <div className="absolute right-3 top-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openPicker}
              className="shadow-card"
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onChange(null)}
              className="shadow-card"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openPicker()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragging
              ? 'border-leaf-500 bg-leaf-500/10'
              : 'border-forest-200 bg-cream-50 hover:border-leaf-400 hover:bg-cream-100',
          )}
        >
          <ImagePlus className="h-12 w-12 text-forest-300" aria-hidden="true" />
          <div>
            <p className="font-medium text-forest-800">Drop a photo here</p>
            <p className="mt-1 text-sm text-ink-400">
              or click to browse. A clear side view of the whole insect works best.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={openPicker}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Choose image
            </Button>
            {'capture' in HTMLInputElement.prototype && (
              <Button type="button" variant="ghost" size="sm" onClick={openPicker}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Use camera
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}