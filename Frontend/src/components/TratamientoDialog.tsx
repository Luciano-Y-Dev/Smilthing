import { useEffect, useRef, useState } from 'react'
import { FormInput, FormTextarea } from './ui'

interface TratamientoDialogProps {
  initialText?: string
  initialDate?: string
  error?: string | null
  busy?: boolean
  onCancel: () => void
  onSave: (text: string, date: string) => void
}

const today = new Date().toISOString().slice(0, 10)

export default function TratamientoDialog({
  initialText = '',
  initialDate = today,
  error,
  busy = false,
  onCancel,
  onSave,
}: TratamientoDialogProps) {
  const [text, setText] = useState(initialText)
  const [date, setDate] = useState(initialDate)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  const busyRef = useRef(busy)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (busyRef.current) return
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && dialogRef.current?.contains(active)
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tratamiento"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-[20px] bg-surface p-6 shadow-lift"
      >
        <h2 className="text-lg font-bold text-ink">
          {initialText ? 'Editar Tratamiento' : 'Agregar Tratamiento'}
        </h2>

        <div className="mt-4 space-y-4">
          <FormInput
            label="Fecha"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <FormTextarea
            label="Tratamiento (diagnóstico y procedimiento)"
            placeholder="Describa el diagnóstico y tratamiento realizado..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(text.trim(), date)}
            disabled={busy}
            className="h-10 cursor-pointer rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
