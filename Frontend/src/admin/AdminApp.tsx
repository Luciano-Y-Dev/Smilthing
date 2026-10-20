import { useEffect, useState } from 'react'
import { adminApi, type SuperInfo } from '../api/admin'
import { adminThemeVars } from './theme'
import AdminLoginPage from './AdminLoginPage'
import AdminDashboard from './AdminDashboard'

export default function AdminApp() {
  const [superInfo, setSuperInfo] = useState<SuperInfo | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    adminApi
      .me()
      .then(info => {
        if (!cancelled) setSuperInfo(info)
      })
      .catch(() => {
        if (!cancelled) setSuperInfo(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#0c0a0a'
    return () => {
      document.body.style.backgroundColor = prev
    }
  }, [])

  return (
    <div
      style={adminThemeVars}
      className="relative min-h-[100dvh] overflow-x-clip bg-canvas font-sans text-ink"
    >
      <div className="relative z-10">
        {superInfo === undefined ? (
          <main className="flex min-h-[100dvh] items-center justify-center text-sm text-muted">
            Cargando…
          </main>
        ) : superInfo === null ? (
          <AdminLoginPage onLoggedIn={info => setSuperInfo(info)} />
        ) : (
          <AdminDashboard superInfo={superInfo} onLogout={() => setSuperInfo(null)} />
        )}
      </div>
    </div>
  )
}
