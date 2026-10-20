import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  CaretLeft,
  CaretRight,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react'
import { api } from '../api'
import { ApiError } from '../api/client'
import CitaDialog, { type CitaFormValues } from '../components/CitaDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Cita, CitaEstado, PatientWithBalance } from '../types'

const todayISO = () => new Date().toISOString().slice(0, 10)

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // lunes
  d.setDate(d.getDate() + diff)
  return toISO(d)
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

const ESTADO_LABEL: Record<CitaEstado, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_presento: 'No presentó',
}

const ESTADO_BADGE: Record<CitaEstado, string> = {
  pendiente: 'bg-info-soft text-info',
  completada: 'bg-success-soft text-success',
  cancelada: 'bg-canvas text-muted',
  no_presento: 'bg-danger-soft text-danger',
}

const actionBtn =
  'h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function CitasPage() {
  const [searchParams] = useSearchParams()
  const pacienteParam = searchParams.get('paciente')

  const [view, setView] = useState<'dia' | 'semana'>('dia')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [citas, setCitas] = useState<Cita[]>([])
  const [patients, setPatients] = useState<PatientWithBalance[]>([])
  const [pageError, setPageError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialog, setDialog] = useState<{
    editing: Cita | null
    preselectPatient: number | null
  } | null>(() => {
    if (pacienteParam) {
      const id = Number(pacienteParam)
      if (Number.isFinite(id)) return { editing: null, preselectPatient: id }
    }
    return null
  })
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [deleting, setDeleting] = useState<Cita | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null)

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])

  const loadCitas = useCallback(async () => {
    const desde = view === 'dia' ? selectedDate : weekStart
    const hasta = view === 'dia' ? selectedDate : addDays(weekStart, 6)
    try {
      const data = await api.getCitas(desde, hasta)
      setCitas(data)
      setPageError(null)
    } catch (e) {
      setPageError(
        e instanceof ApiError ? e.message : 'No se pudieron cargar las citas.',
      )
    } finally {
      setLoading(false)
    }
  }, [view, selectedDate, weekStart])

  useEffect(() => {
    let active = true
    api.getPatients().then(
      p => {
        if (active) setPatients(p)
      },
      () => {
        /* la lista de pacientes se recarga al abrir el diálogo */
      },
    )
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const desde = view === 'dia' ? selectedDate : weekStart
    const hasta = view === 'dia' ? selectedDate : addDays(weekStart, 6)
    api.getCitas(desde, hasta).then(
      data => {
        if (!active) return
        setCitas(data)
        setPageError(null)
        setLoading(false)
      },
      e => {
        if (!active) return
        setPageError(
          e instanceof ApiError ? e.message : 'No se pudieron cargar las citas.',
        )
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [view, selectedDate, weekStart])

  const dayCitas = useMemo(
    () => citas.filter(c => c.fecha === selectedDate),
    [citas, selectedDate],
  )

  const weekDays = useMemo(() => {
    const days: { iso: string; citas: Cita[] }[] = []
    for (let i = 0; i < 7; i++) {
      const iso = addDays(weekStart, i)
      days.push({ iso, citas: citas.filter(c => c.fecha === iso) })
    }
    return days
  }, [citas, weekStart])

  const openNew = () => {
    setDialogError(null)
    setDialog({ editing: null, preselectPatient: null })
  }

  const openEdit = (cita: Cita) => {
    setDialogError(null)
    setDialog({ editing: cita, preselectPatient: null })
  }

  const handleSave = async (values: CitaFormValues) => {
    setDialogBusy(true)
    setDialogError(null)
    try {
      if (dialog?.editing) {
        await api.updateCita(dialog.editing.id, values)
      } else {
        await api.saveCita(values)
      }
      setDialog(null)
      await loadCitas()
    } catch (e) {
      setDialogError(
        e instanceof ApiError ? e.message : 'No se pudo guardar la cita.',
      )
    } finally {
      setDialogBusy(false)
    }
  }

  const changeEstado = async (cita: Cita, estado: CitaEstado) => {
    setStatusBusyId(cita.id)
    try {
      await api.setCitaEstado(cita.id, estado)
      await loadCitas()
    } catch (e) {
      setPageError(
        e instanceof ApiError ? e.message : 'No se pudo actualizar la cita.',
      )
    } finally {
      setStatusBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteCita(deleting.id)
      setDeleting(null)
      await loadCitas()
    } catch (e) {
      setPageError(
        e instanceof ApiError ? e.message : 'No se pudo eliminar la cita.',
      )
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const isToday = selectedDate === todayISO()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar size={22} className="text-accent-strong" weight="fill" />
          <h1 className="m-0 text-2xl font-bold text-ink">Citas</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-surface p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setView('dia')}
              className={`h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${
                view === 'dia'
                  ? 'bg-accent-strong text-white'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setView('semana')}
              className={`h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${
                view === 'semana'
                  ? 'bg-accent-strong text-white'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Semana
            </button>
          </div>

          <button
            type="button"
            onClick={openNew}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
          >
            <Plus size={17} weight="bold" />
            Nueva cita
          </button>
        </div>
      </header>

      {pageError && (
        <p
          role="alert"
          className="shrink-0 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {pageError}
        </p>
      )}

      {view === 'dia' ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Día anterior"
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-surface text-ink shadow-soft transition-colors hover:text-accent-strong"
            >
              <CaretLeft size={17} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Día siguiente"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-surface text-ink shadow-soft transition-colors hover:text-accent-strong"
            >
              <CaretRight size={17} weight="bold" />
            </button>
            <p className="ml-1 text-base font-bold text-ink">
              {formatLong(selectedDate)}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO())}
                className="ml-2 h-8 cursor-pointer rounded-lg bg-accent-soft px-3 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent"
              >
                Hoy
              </button>
            )}
          </div>

          <section className="flex min-h-0 flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-soft sm:p-6">
            {loading ? (
              <>
                <div className="h-[72px] animate-pulse rounded-xl bg-canvas" />
                <div className="h-[72px] animate-pulse rounded-xl bg-canvas" />
              </>
            ) : dayCitas.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                No hay citas para este día.
              </p>
            ) : (
              dayCitas.map(cita => (
                <article
                  key={cita.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl bg-canvas p-4"
                >
                  <div className="w-16 shrink-0">
                    <p className="text-base font-bold tabular-nums text-accent-strong">
                      {cita.hora}
                    </p>
                    <p className="text-xs text-muted">{cita.duracionMin} min</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {cita.patientName}
                    </p>
                    {cita.notas && (
                      <p className="truncate text-xs text-muted">{cita.notas}</p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_BADGE[cita.estado]}`}
                  >
                    {ESTADO_LABEL[cita.estado]}
                  </span>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {cita.estado === 'pendiente' && (
                      <>
                        <button
                          type="button"
                          disabled={statusBusyId === cita.id}
                          onClick={() => changeEstado(cita, 'completada')}
                          className={`${actionBtn} bg-success-soft text-success hover:bg-success hover:text-white`}
                        >
                          Completar
                        </button>
                        <button
                          type="button"
                          disabled={statusBusyId === cita.id}
                          onClick={() => changeEstado(cita, 'no_presento')}
                          className={`${actionBtn} bg-danger-soft text-danger hover:bg-danger hover:text-white`}
                        >
                          No presentó
                        </button>
                        <button
                          type="button"
                          disabled={statusBusyId === cita.id}
                          onClick={() => changeEstado(cita, 'cancelada')}
                          className={`${actionBtn} bg-surface text-muted hover:bg-canvas hover:text-ink`}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label="Editar cita"
                      onClick={() => openEdit(cita)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-surface text-muted shadow-soft transition-colors hover:text-accent-strong"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar cita"
                      onClick={() => setDeleting(cita)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-danger-soft text-danger transition-colors hover:bg-danger hover:text-white"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={() => setSelectedDate(d => addDays(d, -7))}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-surface text-ink shadow-soft transition-colors hover:text-accent-strong"
            >
              <CaretLeft size={17} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => setSelectedDate(d => addDays(d, 7))}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-surface text-ink shadow-soft transition-colors hover:text-accent-strong"
            >
              <CaretRight size={17} weight="bold" />
            </button>
            <p className="ml-1 text-base font-bold text-ink">
              {formatLong(weekStart)} — {formatLong(addDays(weekStart, 6))}
            </p>
            {!weekDays.some(d => d.iso === todayISO()) && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO())}
                className="ml-2 h-8 cursor-pointer rounded-lg bg-accent-soft px-3 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent"
              >
                Esta semana
              </button>
            )}
          </div>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {weekDays.map((day, idx) => {
              const isTodayCol = day.iso === todayISO()
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.iso)
                    setView('dia')
                  }}
                  className={`flex min-h-40 cursor-pointer flex-col gap-1.5 rounded-[20px] bg-surface p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift ${
                    isTodayCol ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <p className="text-xs font-bold text-muted">
                    {WEEKDAYS[idx]}{' '}
                    <span className="text-ink">{day.iso.slice(8)}</span>
                  </p>
                  {day.citas.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">—</p>
                  ) : (
                    day.citas.map(cita => (
                      <span
                        key={cita.id}
                        className={`truncate rounded-lg px-2 py-1 text-xs font-semibold ${ESTADO_BADGE[cita.estado]}`}
                      >
                        {cita.hora} {cita.patientName}
                      </span>
                    ))
                  )}
                </button>
              )
            })}
          </section>
        </>
      )}

      {dialog && (
        <CitaDialog
          patients={patients}
          initialPatientID={dialog.editing?.patientID ?? dialog.preselectPatient}
          initialFecha={dialog.editing?.fecha ?? selectedDate}
          initialHora={dialog.editing?.hora}
          initialDuracionMin={dialog.editing?.duracionMin}
          initialNotas={dialog.editing?.notas ?? ''}
          initialCitaId={dialog.editing?.id ?? null}
          error={dialogError}
          busy={dialogBusy}
          onCancel={() => setDialog(null)}
          onSave={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar cita"
          message={`¿Seguro que quieres eliminar la cita de ${deleting.patientName} del ${formatLong(deleting.fecha)} a las ${deleting.hora}?`}
          confirmLabel="Eliminar"
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
