import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from '@phosphor-icons/react'
import type { AdminClinicaUpdate, ClinicaAdminRow } from '../../api/admin'
import { Field, FormInput } from '../../components/ui'
import { ctaClass, formatDate } from '../theme'
import type { EditorTab } from './ClinicTable'
import BrandingEditor from './BrandingEditor'
import PagosPanel from './PagosPanel'

const tabs: { id: EditorTab; label: string }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'marca', label: 'Marca' },
  { id: 'pagos', label: 'Pagos' },
]

function DatosTab({
  clinica,
  busy,
  onAction,
}: {
  clinica: ClinicaAdminRow
  busy: boolean
  onAction: (input: AdminClinicaUpdate) => Promise<void>
}) {
  const [nombre, setNombre] = useState(clinica.nombre)
  const [email, setEmail] = useState(clinica.email_admin ?? '')
  const [password, setPassword] = useState('')
  const [dias, setDias] = useState('30')
  const [saving, setSaving] = useState(false)
  const [extending, setExtending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const dirty =
    nombre.trim() !== clinica.nombre ||
    email.trim() !== (clinica.email_admin ?? '') ||
    password.length > 0

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setActionError(null)
    try {
      const input: AdminClinicaUpdate = {}
      if (nombre.trim() && nombre.trim() !== clinica.nombre) {
        input.nombre = nombre.trim()
      }
      if (email.trim() && email.trim() !== (clinica.email_admin ?? '')) {
        input.email = email.trim()
      }
      if (password) input.password = password
      if (Object.keys(input).length > 0) {
        await onAction(input)
        setPassword('')
      }
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'No se pudo guardar los cambios.',
      )
    } finally {
      setSaving(false)
    }
  }

  const extend = async (event: FormEvent) => {
    event.preventDefault()
    setExtending(true)
    setActionError(null)
    try {
      await onAction({ estado: 'trial', dias_trial: Number(dias) || 30 })
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'No se pudo extender el trial.',
      )
    } finally {
      setExtending(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs font-medium text-muted">Editar datos</p>
        <FormInput
          label="Nombre de la clínica"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la clínica"
        />
        <FormInput
          label="Correo del administrador"
          type="text"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@clinica.com"
        />
        <FormInput
          label="Nueva contraseña (opcional)"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="En blanco para no cambiar"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || saving || !dirty}
            className={`h-10 cursor-pointer rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        {actionError && (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {actionError}
          </p>
        )}
      </form>

      <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4">
        <Field label="Pacientes" value={clinica.pacientes} />
        <Field label="Estado" value={clinica.estado} />
        <Field label="Trial hasta" value={formatDate(clinica.trial_expires)} />
        <Field label="Creada" value={formatDate(clinica.created_at)} />
      </div>

      <div className="border-t border-white/[0.08] pt-4">
        <p className="text-xs font-medium text-muted">Cambiar estado</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['trial', 'activo', 'gratis', 'suspendido'] as const).map(estado => (
            <button
              key={estado}
              type="button"
              disabled={busy || clinica.estado === estado}
              onClick={() => {
                setActionError(null)
                void onAction({ estado }).catch(e => {
                  setActionError(
                    e instanceof Error ? e.message : 'No se pudo cambiar el estado.',
                  )
                })
              }}
              className={`h-9 cursor-pointer rounded-xl px-4 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                clinica.estado === estado
                  ? 'bg-accent-soft text-accent'
                  : 'border border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-ink'
              }`}
            >
              {estado === 'trial'
                ? 'Trial'
                : estado === 'activo'
                  ? 'Activo'
                  : estado === 'gratis'
                    ? '∞ Gratis'
                    : 'Suspendido'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={extend} className="border-t border-white/[0.08] pt-4">
        <p className="text-xs font-medium text-muted">Extender trial</p>
        <div className="mt-2 flex items-end gap-2">
          <div className="w-28">
            <FormInput
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={e => setDias(e.target.value)}
              aria-label="Días a extender"
            />
          </div>
          <button
            type="submit"
            disabled={busy || extending}
            className={`h-11 cursor-pointer rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
          >
            {extending ? 'Extendiendo…' : 'Extender'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ClinicEditor({
  clinica,
  initialTab,
  busy,
  onClose,
  onAction,
  onBrandSaved,
}: {
  clinica: ClinicaAdminRow
  initialTab: EditorTab
  busy: boolean
  onClose: () => void
  onAction: (input: AdminClinicaUpdate) => Promise<void>
  onBrandSaved: () => void
}) {
  const [tab, setTab] = useState<EditorTab>(initialTab)
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (busyRef.current) return
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && panelRef.current?.contains(active)
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
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar editor"
        onClick={() => {
          if (!busy) onClose()
        }}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${clinica.nombre}`}
        className={`admin-slide relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#111010]/95 backdrop-blur-2xl`}
      >
        <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-ink">{clinica.nombre}</h2>
            <p className="truncate text-xs text-muted">{clinica.email_admin ?? '—'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose()
            }}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>

        <nav className="flex gap-1 border-b border-white/[0.08] px-5 py-3">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`h-9 cursor-pointer rounded-xl px-4 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div         className="flex-1 overflow-y-auto bg-[#151012] p-5">
          {tab === 'datos' && (
            <DatosTab clinica={clinica} busy={busy} onAction={onAction} />
          )}
          {tab === 'marca' && (
            <BrandingEditor clinica={clinica} onSaved={onBrandSaved} />
          )}
          {tab === 'pagos' && <PagosPanel clinica={clinica} />}
        </div>
      </aside>
    </div>
  )
}
