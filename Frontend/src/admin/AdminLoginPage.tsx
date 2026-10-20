import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type SuperInfo } from '../api/admin'
import { FormInput } from '../components/ui'
import PlatformMark from '../components/PlatformMark'
import { solidPanel, ctaClass } from './theme'
import { PLATFORM_NAME } from '../brand'

export default function AdminLoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (info: SuperInfo) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const info = await adminApi.login(email.trim(), password)
      onLoggedIn(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6">
      <div className={`admin-rise w-full max-w-sm p-8 ${solidPanel}`}>
        <div className="flex flex-col items-center gap-3 pb-7">
          <PlatformMark className="h-11 w-11 text-accent" />
          <h1 className="text-lg font-extrabold uppercase tracking-[0.2em] text-ink">{PLATFORM_NAME}</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormInput
            label="Correo electrónico"
            type="text"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@sistema.com"
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
            <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`h-11 w-full cursor-pointer rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
          >
            {busy ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            to="/"
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  )
}
