import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowCounterClockwise,
  Calendar,
  Clock,
  DownloadSimple,
  HardDrive,
  List,
  SignOut,
  UserCircle,
  Users,
  Wallet,
  X,
  type Icon,
} from '@phosphor-icons/react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api'
import ConfirmDialog from './ConfirmDialog'
import ClinicLogo from './ClinicLogo'

interface NavItem {
  label: string
  to: string
  icon: Icon
}

const navItems: NavItem[] = [
  { label: 'Pacientes', to: '/pacientes', icon: Users },
  { label: 'Citas', to: '/citas', icon: Calendar },
  { label: 'Abonos', to: '/abonos', icon: Wallet },
  { label: 'Exportar datos', to: '/exportar', icon: DownloadSimple },
  { label: 'Cuenta', to: '/cuenta', icon: UserCircle },
]

function isNavActive(pathname: string, to: string): boolean {
  return pathname.startsWith(to)
}

function NavItemButton({
  label,
  to,
  icon: IconComponent,
  active,
}: NavItem & { active: boolean }) {
  return (
    <NavLink
      to={to}
      className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold no-underline transition-colors ${
        active
          ? 'bg-accent-soft text-accent-strong'
          : 'text-muted hover:bg-canvas hover:text-ink'
      }`}
    >
      <IconComponent size={19} weight={active ? 'fill' : 'regular'} />
      {label}
    </NavLink>
  )
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { me, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  )
  const [backupError, setBackupError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<File | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', close)
    }
  }, [menuOpen])

  const handleBackup = async () => {
    setBackupError(null)
    try {
      await api.downloadBackup()
    } catch (e) {
      setBackupError(
        e instanceof Error ? e.message : 'No se pudo generar el respaldo.',
      )
    }
  }

  const handleRestoreFile = (file: File | null) => {
    if (!file) return
    setRestoreError(null)
    setRestoring(file)
  }

  const confirmRestore = async () => {
    if (!restoring) return
    setRestoreBusy(true)
    setRestoreError(null)
    try {
      await api.restoreBackup(restoring)
      setRestoring(null)
      window.location.reload()
    } catch (e) {
      setRestoreError(
        e instanceof Error ? e.message : 'No se pudo restaurar el respaldo.',
      )
    } finally {
      setRestoreBusy(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const trialDays = me?.clinica.estado === 'trial' ? me.dias_restantes : null

  return (
    <div className="flex h-dvh gap-3 overflow-hidden bg-canvas p-3 font-sans">
      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      )}

      <aside
        inert={!menuOpen && !isDesktop}
        className={`fixed inset-y-3 left-3 z-40 flex w-[248px] shrink-0 flex-col rounded-[20px] bg-surface p-4 shadow-soft transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          menuOpen
            ? 'translate-x-0'
            : '-translate-x-[calc(100%+1.5rem)] lg:translate-x-0'
        }`}
      >
        <div className="relative flex flex-col items-center px-2 pb-7 pt-3">
          <ClinicLogo className="h-14 w-auto object-contain" />
          <p className="mt-2 w-full truncate text-center text-sm font-semibold text-ink">
            {me?.clinica.nombre}
          </p>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute right-0 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas hover:text-ink lg:hidden"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {trialDays !== null && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-strong">
            <Clock size={15} weight="bold" className="shrink-0" />
            {trialDays > 0
              ? `Prueba: ${trialDays} ${trialDays === 1 ? 'día restante' : 'días restantes'}`
              : 'Prueba finalizada'}
          </div>
        )}

        <nav
          className="flex flex-col gap-1"
          onClick={() => setMenuOpen(false)}
        >
          {navItems.map(item => (
            <NavItemButton
              key={item.to}
              {...item}
              active={isNavActive(pathname, item.to)}
            />
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex flex-col gap-1 border-t border-divider pt-3">
          <button
            type="button"
            onClick={() => void handleBackup()}
            className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <HardDrive size={19} />
            Respaldar datos
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <ArrowCounterClockwise size={19} />
            Restaurar respaldo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={e => handleRestoreFile(e.target.files?.[0] ?? null)}
          />
          {backupError && (
            <p
              role="alert"
              className="mt-1 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger"
            >
              {backupError}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted">
            <span className="min-w-0 flex-1 truncate">{me?.usuario.email}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-danger"
          >
            <SignOut size={19} />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6">
        <header className="mb-3 flex shrink-0 items-center gap-3 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-ink shadow-soft transition-colors hover:text-accent-strong"
          >
            <List size={22} weight="bold" />
          </button>
          <ClinicLogo className="h-9 w-auto object-contain" alt="" />
        </header>
        <Outlet />
      </main>

      {restoring && (
        <ConfirmDialog
          title="Restaurar respaldo"
          message={`¿Seguro que querés restaurar el respaldo "${restoring.name}"?\nSe reemplazarán TODOS los datos actuales de la clínica. Esta acción no se puede deshacer.`}
          confirmLabel="Restaurar"
          error={restoreError}
          busy={restoreBusy}
          onCancel={() => {
            if (!restoreBusy) {
              setRestoring(null)
              setRestoreError(null)
            }
          }}
          onConfirm={() => void confirmRestore()}
        />
      )}
    </div>
  )
}
