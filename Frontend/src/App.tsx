import { Suspense, lazy, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppLayout from './components/AppLayout'
import ClinicTheme from './components/ClinicTheme'
import ClinicWelcome from './components/ClinicWelcome'
import PatientsPage from './pages/PatientsPage'
import PaymentsPage from './pages/PaymentsPage'
import CitasPage from './pages/CitasPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import TerminosPage from './pages/TerminosPage'
import CuentaPage from './pages/CuentaPage'

const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'))
const PatientFormPage = lazy(() => import('./pages/PatientFormPage'))
const ExportPage = lazy(() => import('./pages/ExportPage'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

function UnderConstruction({ title }: { title: string }) {
  return (
    <main className="flex min-h-[calc(100vh-1.5rem)] flex-col items-center justify-center gap-2 font-sans text-ink">
      <h1 className="m-0 text-2xl font-bold text-accent-strong">{title}</h1>
      <p className="m-0 text-sm text-muted">En construcción</p>
      <Link to="/pacientes" className="mt-3 text-sm font-semibold text-accent-strong no-underline hover:underline">
        ← Volver a la lista
      </Link>
    </main>
  )
}

function LoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas font-sans">
      <p className="text-sm font-semibold text-muted">Cargando…</p>
    </main>
  )
}

function BlockedScreen({ title, message }: { title: string; message: string }) {
  const { logout } = useAuth()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 font-sans">
      <div className="w-full max-w-sm rounded-[20px] bg-surface p-8 text-center shadow-soft">
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 h-11 w-full cursor-pointer rounded-xl bg-accent-strong text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}

function ProtectedLayout() {
  const { me, loading, blocked } = useAuth()
  const [welcome, setWelcome] = useState(true)

  if (loading) return <LoadingScreen />
  if (blocked) {
    return blocked.code === 'trial_vencido' ? (
      <BlockedScreen
        title="Período de prueba finalizado"
        message={blocked.message}
      />
    ) : (
      <BlockedScreen title="Cuenta suspendida" message={blocked.message} />
    )
  }
  if (!me) return <Navigate to="/" replace />
  if (me.usuario.must_change_password) {
    return (
      <ClinicTheme>
        <CuentaPage />
      </ClinicTheme>
    )
  }

  return (
    <ClinicTheme>
      {welcome && <ClinicWelcome onContinue={() => setWelcome(false)} />}
      <Outlet />
    </ClinicTheme>
  )
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (me) return <Navigate to="/pacientes" replace />
  return <>{children}</>
}

function PublicLanding() {
  return <LandingPage />
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<PublicLanding />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route element={<ProtectedLayout />}>
          <Route element={<AppLayout />}>
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route path="/citas" element={<CitasPage />} />
            <Route path="/pacientes/nuevo" element={<PatientFormPage />} />
            <Route path="/pacientes/:id/editar" element={<PatientFormPage />} />
            <Route path="/pacientes/:id" element={<PatientDetailPage />} />
            <Route path="/abonos" element={<PaymentsPage />} />
            <Route path="/exportar" element={<ExportPage />} />
            <Route path="/cuenta" element={<CuentaPage />} />
            <Route path="*" element={<UnderConstruction title="Página no encontrada" />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
