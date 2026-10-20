import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { FormInput } from '../components/ui'
import PlatformMark from '../components/PlatformMark'
import { PLATFORM_NAME } from '../brand'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/pacientes')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 font-sans">
      <div className="w-full max-w-sm rounded-[20px] bg-surface p-8 shadow-soft">
        <div className="flex flex-col items-center gap-3 pb-7">
          <PlatformMark className="h-12 w-12 text-accent-strong" />
          <h1 className="text-xl font-bold text-ink">Iniciar sesión</h1>
          <p className="text-sm text-muted">
            <span className="font-extrabold uppercase tracking-[0.2em] text-ink">
              {PLATFORM_NAME}
            </span>{' '}
            · Acceso a la clínica
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormInput
            label="Correo o clínica"
            type="text"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@clinica.com o el nombre de tu clínica"
          />
          <FormInput
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full cursor-pointer rounded-xl bg-accent-strong text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            to="/terminos"
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Términos y condiciones
          </Link>
        </p>
      </div>
    </main>
  )
}
