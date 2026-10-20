import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { useAuth } from '../auth/AuthContext'
import PlatformMark from '../components/PlatformMark'
import { PLATFORM_NAME, PLATFORM_COPYRIGHT } from '../brand'
import heroConsultorio from '../assets/hero-consultorio.webp'

const capabilities = [
  {
    title: 'Paciente en el centro',
    body: 'Historia clínica, examen y odontograma en una sola ficha.',
  },
  {
    title: 'Tratamientos y abonos',
    body: 'Costos, saldos y pagos claros, sin planillas paralelas.',
  },
  {
    title: 'Citas al día',
    body: 'Agenda por día o semana, con estados claros: pendiente, completada o no presentó.',
  },
]

export default function LandingPage() {
  const { me } = useAuth()

  return (
    <div className="relative min-h-[100dvh] bg-ink font-sans lg:h-[100dvh] lg:overflow-hidden">
      <div className="absolute inset-0 isolate" aria-hidden="true">
        <div className="absolute inset-0 bg-accent-strong" />
        <img
          src={heroConsultorio}
          alt=""
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-95 mix-blend-multiply grayscale contrast-[1.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/60" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col lg:h-full">
        <header className="ed-fade flex shrink-0 items-center gap-2.5 px-6 py-5 lg:px-10">
          <PlatformMark className="h-7 w-7 text-white" />
          <span className="text-sm font-extrabold uppercase tracking-[0.22em] text-white">
            {PLATFORM_NAME}
          </span>
        </header>

        <main className="flex flex-1 items-center px-6 lg:px-10">
          <div className="max-w-[46rem]">
            <h1
              className="ed-rise text-[3rem] font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-7xl lg:text-[5.25rem]"
              style={{ animationDelay: '80ms' }}
            >
              Tu clínica,
              <br />
              en calma.
            </h1>
            <p
              className="ed-rise mt-6 max-w-[40ch] text-lg leading-relaxed text-white/80"
              style={{ animationDelay: '170ms' }}
            >
              Pacientes, tratamientos, abonos y odontogramas en un solo lugar.
              Simple para tu equipo, claro para tus pacientes.
            </p>
            <div className="ed-rise" style={{ animationDelay: '250ms' }}>
              <Link
                to={me ? '/pacientes' : '/login'}
                className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white pl-7 pr-6 text-sm font-semibold text-ink no-underline transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                {me ? 'Entrar a mi clínica' : 'Iniciar sesión'}
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </main>

        <div
          className="ed-rise shrink-0 border-t border-white/15 px-6 lg:px-10"
          style={{ animationDelay: '340ms' }}
        >
          <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {capabilities.map(cap => (
              <div key={cap.title} className="py-3.5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[13px] font-semibold tracking-tight text-white">
                  {cap.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/70">
                  {cap.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-white/70 lg:px-10">
          <p>{PLATFORM_COPYRIGHT}</p>
          <div className="flex items-center gap-5">
            <Link
              to="/terminos"
              className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              Términos y condiciones
            </Link>
            <Link
              to="/admin"
              className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              Administración
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
