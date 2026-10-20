import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import ClinicLogo from './ClinicLogo'

interface ClinicWelcomeProps {
  onContinue: () => void
}

const blobBackground = (alpha: number, stop: number) =>
  ({
    background: `radial-gradient(circle, color-mix(in oklab, var(--color-accent) ${alpha}%, transparent), transparent ${stop}%)`,
  }) as const

export default function ClinicWelcome({ onContinue }: ClinicWelcomeProps) {
  const { me } = useAuth()
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const clinica = me?.clinica
  if (!clinica) return null

  const handleContinue = () => {
    if (exiting) return
    setExiting(true)
    window.setTimeout(onContinue, 350)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bienvenida — ${clinica.nombre}`}
      className={`fixed inset-0 z-60 flex items-center justify-center overflow-hidden bg-canvas p-6 ${
        exiting ? 'splash-exit' : 'splash-fade'
      }`}
    >
      <div aria-hidden className="splash-fade pointer-events-none absolute inset-0">
        <div
          className="splash-drift-a absolute -left-44 -top-48 h-[30rem] w-[30rem] rounded-full"
          style={blobBackground(45, 65)}
        />
        <div
          className="splash-drift-b absolute -bottom-56 -right-40 h-[36rem] w-[36rem] rounded-full"
          style={{ ...blobBackground(30, 65), animationDelay: '450ms' }}
        />
        <div
          className="splash-drift-c absolute -left-32 bottom-0 h-[26rem] w-[26rem] rounded-full"
          style={{ ...blobBackground(24, 70), animationDelay: '700ms' }}
        />
        <div
          className="splash-sheen absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ animationDelay: '800ms' }}
        />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="relative flex w-full max-w-[27rem] items-center justify-center">
          <span
            aria-hidden
            className="splash-halo absolute left-1/2 top-1/2 h-44 w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              ...blobBackground(42, 70),
              animationDelay: '450ms',
            }}
          />
          <ClinicLogo
            className="splash-logo relative h-28 w-auto object-contain"
            style={{ animationDelay: '250ms' }}
          />
        </div>

        <h1 className="mt-9 w-full text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.03em] text-balance text-ink sm:text-5xl">
          <span className="block overflow-hidden">
            <span className="splash-rise block" style={{ animationDelay: '600ms' }}>
              Bienvenido/a
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              className="splash-rise block"
              style={{ animationDelay: '720ms' }}
            >
              {clinica.nombre}
            </span>
          </span>
        </h1>

        <p
          className="splash-up mt-5 max-w-xs text-lg leading-relaxed text-ink/70"
          style={{ animationDelay: '950ms' }}
        >
          Es un gusto que estés aquí.
        </p>

        <span
          aria-hidden
          className="splash-draw mt-8 block h-px w-20 bg-accent/50"
          style={{ animationDelay: '1150ms' }}
        />

        <button
          type="button"
          autoFocus
          disabled={exiting}
          onClick={handleContinue}
          className="splash-shine splash-up relative mt-9 h-12 cursor-pointer overflow-hidden rounded-xl bg-accent-strong px-10 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-accent-strong/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong active:scale-[0.98] disabled:cursor-default"
          style={{ animationDelay: '1300ms' }}
        >
          Continuar
        </button>
      </div>

      <div
        aria-hidden
        className="splash-vignette splash-fade pointer-events-none absolute inset-0"
        style={{ animationDelay: '300ms' }}
      />
      <div
        aria-hidden
        className="splash-grain splash-fade pointer-events-none absolute inset-0"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}
