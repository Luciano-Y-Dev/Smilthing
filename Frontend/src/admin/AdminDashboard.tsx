import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SignOut, X } from '@phosphor-icons/react'
import {
  adminApi,
  type AdminClinicaUpdate,
  type ClinicaAdminRow,
  type EstadisticasAdmin,
  type SuperInfo,
} from '../api/admin'
import { FormInput } from '../components/ui'
import ConfirmDialog from '../components/ConfirmDialog'
import PlatformMark from '../components/PlatformMark'
import { glassCard, solidPanel, ctaClass } from './theme'
import { PLATFORM_NAME } from '../brand'
import StatsBento from './components/StatsBento'
import ClinicTable, { type EditorTab } from './components/ClinicTable'
import ClinicEditor from './components/ClinicEditor'

function NuevaClinicaDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [diasTrial, setDiasTrial] = useState('30')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstInputRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (busyRef.current) return
        onCloseRef.current()
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
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await adminApi.createClinica({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        dias_trial: diasTrial ? Number(diasTrial) : null,
      })
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la clínica.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={e => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`admin-rise w-full max-w-md p-6 ${solidPanel}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Nueva clínica</h2>
            <button
              type="button"
              onClick={() => {
                if (!busy) onClose()
              }}
              aria-label="Cerrar"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <FormInput
              label="Nombre de la clínica"
              required
              inputRef={firstInputRef}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Clínica Dental"
            />
            <FormInput
              label="Correo del administrador"
              type="text"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@clinica.com"
            />
            <FormInput
              label="Contraseña"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
            <FormInput
              label="Días de trial"
              type="number"
              min={1}
              max={365}
              value={diasTrial}
              onChange={e => setDiasTrial(e.target.value)}
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!busy) onClose()
                }}
                className="h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`h-10 cursor-pointer rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
              >
                {busy ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}

export default function AdminDashboard({
  superInfo,
  onLogout,
}: {
  superInfo: SuperInfo
  onLogout: () => void
}) {
  const [stats, setStats] = useState<EstadisticasAdmin | null>(null)
  const [clinicas, setClinicas] = useState<ClinicaAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [editing, setEditing] = useState<{ id: number; tab: EditorTab } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ClinicaAdminRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([adminApi.estadisticas(), adminApi.listClinicas()])
      setStats(s)
      setClinicas(c)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([adminApi.estadisticas(), adminApi.listClinicas()]).then(
      ([s, c]) => {
        if (active) {
          setStats(s)
          setClinicas(c)
          setError(null)
        }
      },
      e => {
        if (active) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar la información.')
        }
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const actualizarClinica = async (
    clinica: ClinicaAdminRow,
    input: AdminClinicaUpdate,
  ) => {
    setActionBusy(true)
    try {
      await adminApi.updateClinica(clinica.id, input)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la clínica.')
      throw e
    } finally {
      setActionBusy(false)
    }
  }

  const reactivarEstado = (clinica: ClinicaAdminRow): 'trial' | 'activo' => {
    if (clinica.estado !== 'suspendido') return 'activo'
    const expires = clinica.trial_expires
    if (!expires) return 'activo'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(expires) >= today ? 'trial' : 'activo'
  }

  const onToggleEstado = (clinica: ClinicaAdminRow) =>
    void actualizarClinica(clinica, {
      estado:
        clinica.estado === 'suspendido' ? reactivarEstado(clinica) : 'suspendido',
    })

  const onToggleGratis = (clinica: ClinicaAdminRow) =>
    void actualizarClinica(clinica, {
      estado: clinica.estado === 'gratis' ? 'activo' : 'gratis',
    })

  const eliminarClinica = async () => {
    if (!confirmDelete) return
    setActionBusy(true)
    setDeleteError(null)
    try {
      await adminApi.deleteClinica(confirmDelete.id)
      setConfirmDelete(null)
      if (editing?.id === confirmDelete.id) setEditing(null)
      await reload()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar la clínica.')
    } finally {
      setActionBusy(false)
    }
  }

  const logout = async () => {
    try {
      await adminApi.logout()
    } finally {
      onLogout()
    }
  }

  const editingClinica = editing
    ? (clinicas.find(c => c.id === editing.id) ?? null)
    : null

  const trialsPorVencer = (() => {
    const limit = new Date()
    limit.setDate(limit.getDate() + 7)
    limit.setHours(23, 59, 59, 999)
    return clinicas
      .filter(c => {
        if (c.estado !== 'trial' || !c.trial_expires) return false
        return new Date(c.trial_expires) <= limit
      })
      .map(c => ({ id: c.id, nombre: c.nombre, trial_expires: c.trial_expires }))
  })()

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className={`admin-rise m-3 flex shrink-0 flex-wrap items-center gap-3 p-4 ${glassCard}`}>
        <PlatformMark className="h-9 w-9 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold uppercase tracking-[0.2em] text-ink">
            {PLATFORM_NAME}
          </h1>
          <p className="truncate text-xs text-muted">Administración · {superInfo.email}</p>
        </div>
        <Link
          to="/pacientes"
          className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-ink sm:flex"
        >
          Ir a la clínica
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <SignOut size={16} />
          Salir
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-4 overflow-y-auto px-4 pb-6 pt-2">
        {loading && !stats ? (
          <section className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-[86px] animate-pulse ${glassCard}`} />
            ))}
          </section>
        ) : (
          stats && <StatsBento stats={stats} trials={trialsPorVencer} />
        )}

        {error && (
          <p role="alert" className="shrink-0 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <ClinicTable
          clinicas={clinicas}
          loading={loading}
          busy={actionBusy}
          onEdit={(c, tab) => setEditing({ id: c.id, tab })}
          onToggleEstado={onToggleEstado}
          onToggleGratis={onToggleGratis}
          onDelete={c => {
            setDeleteError(null)
            setConfirmDelete(c)
          }}
          onNueva={() => setShowNueva(true)}
        />
      </main>

      {showNueva && (
        <NuevaClinicaDialog
          onClose={() => setShowNueva(false)}
          onCreated={() => {
            setShowNueva(false)
            void reload()
          }}
        />
      )}

      {editing && editingClinica && (
        <ClinicEditor
          clinica={editingClinica}
          initialTab={editing.tab}
          busy={actionBusy}
          onClose={() => setEditing(null)}
          onAction={input => actualizarClinica(editingClinica, input)}
          onBrandSaved={() => void reload()}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar clínica"
          message={`Se eliminará "${confirmDelete.nombre}" y todos sus datos (pacientes, tratamientos, abonos y base de datos). Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          error={deleteError}
          busy={actionBusy}
          onCancel={() => {
            if (!actionBusy) setConfirmDelete(null)
          }}
          onConfirm={() => void eliminarClinica()}
        />
      )}
    </div>
  )
}
