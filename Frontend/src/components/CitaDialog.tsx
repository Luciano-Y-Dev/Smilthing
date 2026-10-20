import { useEffect, useRef, useState } from 'react'
import type { PatientWithBalance } from '../types'
import { FormInput, FormTextarea } from './ui'

const DURACIONES = [15, 30, 45, 60, 90]

const controlBase =
  'w-full rounded-xl bg-canvas px-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

export interface CitaFormValues {
  patientID: number
  fecha: string
  hora: string
  duracionMin: number
  notas: string
}

interface CitaDialogProps {
  patients: PatientWithBalance[]
  initialPatientID?: number | null
  initialFecha?: string
  initialHora?: string
  initialDuracionMin?: number
  initialNotas?: string
  initialCitaId?: number | null
  error?: string | null
  busy?: boolean
  onCancel: () => void
  onSave: (values: CitaFormValues) => void
}

export default function CitaDialog({
  patients,
  initialPatientID,
  initialFecha,
  initialHora,
  initialDuracionMin,
  initialNotas,
  initialCitaId,
  error,
  busy = false,
  onCancel,
  onSave,
}: CitaDialogProps) {
  const [patientID, setPatientID] = useState<string>(
    initialPatientID != null ? String(initialPatientID) : '',
  )
  const [fecha, setFecha] = useState(initialFecha ?? '')
  const [hora, setHora] = useState(initialHora ?? '09:00')
  const [duracionMin, setDuracionMin] = useState(
    String(initialDuracionMin ?? 30),
  )
  const [notas, setNotas] = useState(initialNotas ?? '')
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

  const handleSave = () => {
    if (!patientID || !fecha || !hora) return
    onSave({
      patientID: Number(patientID),
      fecha,
      hora,
      duracionMin: Number(duracionMin),
      notas: notas.trim(),
    })
  }

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
        aria-label={initialCitaId ? 'Editar cita' : 'Nueva cita'}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-[20px] bg-surface p-6 shadow-lift"
      >
        <h2 className="text-lg font-bold text-ink">
          {initialCitaId ? 'Editar cita' : 'Nueva cita'}
        </h2>

        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Paciente</span>
            <select
              value={patientID}
              onChange={e => setPatientID(e.target.value)}
              className={`${controlBase} h-11`}
            >
              <option value="">Selecciona un paciente…</option>
              {patients
                .slice()
                .sort((a, b) =>
                  `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`),
                )
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.lastName} — {p.CI}
                  </option>
                ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
            <FormInput
              label="Hora"
              type="time"
              value={hora}
              onChange={e => setHora(e.target.value)}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Duración (min)</span>
            <select
              value={duracionMin}
              onChange={e => setDuracionMin(e.target.value)}
              className={`${controlBase} h-11`}
            >
              {DURACIONES.map(d => (
                <option key={d} value={d}>
                  {d} minutos
                </option>
              ))}
            </select>
          </label>

          <FormTextarea
            label="Notas (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Motivo de la cita, observaciones…"
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

        <div className="mt-5 flex justify-end gap-2">
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
            onClick={handleSave}
            disabled={busy || !patientID || !fecha || !hora}
            className="h-10 cursor-pointer rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
