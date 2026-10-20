import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api'
import type { MeResponse } from '../api/client'

interface BlockedState {
  code: string
  message: string
}

interface AuthContextValue {
  me: MeResponse | null
  loading: boolean
  blocked: BlockedState | null
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  reloadMe(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function gateFromMe(me: MeResponse): BlockedState | null {
  const { clinica } = me
  if (clinica.estado === 'suspendido') {
    return {
      code: 'cuenta_suspendida',
      message: 'La cuenta está suspendida. Contacte para renovar.',
    }
  }
  if (
    clinica.estado === 'trial' &&
    clinica.trial_expires &&
    clinica.trial_expires < new Date().toISOString().slice(0, 10)
  ) {
    return {
      code: 'trial_vencido',
      message: 'El período de prueba finalizó. Contacte para renovar.',
    }
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState<BlockedState | null>(null)

  useEffect(() => {
    let active = true
    api.me().then(
      data => {
        if (!active) return
        setMe(data)
        setBlocked(data ? gateFromMe(data) : null)
        setLoading(false)
      },
      () => {
        if (!active) return
        setMe(null)
        setBlocked(null)
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setMe(null)
      setBlocked(null)
    }
    const onBlocked = (event: Event) => {
      setBlocked((event as CustomEvent<BlockedState>).detail)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    window.addEventListener('auth:blocked', onBlocked)
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized)
      window.removeEventListener('auth:blocked', onBlocked)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password)
    setMe(data)
    setBlocked(gateFromMe(data))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch (e) {
      void e
    } finally {
      setMe(null)
      setBlocked(null)
    }
  }, [])

  const reloadMe = useCallback(async () => {
    const data = await api.me()
    setMe(data)
    setBlocked(data ? gateFromMe(data) : null)
  }, [])

  const value = useMemo(
    () => ({ me, loading, blocked, login, logout, reloadMe }),
    [me, loading, blocked, login, logout, reloadMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
