import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api'
import { FormInput } from '../components/ui'

export default function CuentaPage() {
  const { me, reloadMe } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const mustChange = me?.usuario.must_change_password ?? false

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccess(true)
      await reloadMe()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        Datos de acceso de {me?.clinica.nombre}
      </p>

      {mustChange && (
        <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-strong">
          Tu cuenta usa una contraseña temporal. Debes cambiarla antes de
          continuar utilizando el sistema.
        </p>
      )}

      <section className="mt-6 space-y-4 rounded-[20px] bg-surface p-6 shadow-soft">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Correo de acceso
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {me?.usuario.email}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 border-t border-divider pt-4">
          <FormInput
            label="Contraseña actual"
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
          />
          <FormInput
            label="Nueva contraseña"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={next}
            onChange={e => setNext(e.target.value)}
          />
          <FormInput
            label="Confirmar nueva contraseña"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
              Contraseña actualizada.
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full cursor-pointer rounded-xl bg-accent-strong text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
