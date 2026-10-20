import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

const GENERIC_ACCENT = '#c97f8d'
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function brandVars(colorPrimary: string | null | undefined): CSSProperties {
  const primary =
    colorPrimary && HEX_COLOR.test(colorPrimary) ? colorPrimary : GENERIC_ACCENT
  return {
    '--color-accent': primary,
    '--color-accent-strong': `color-mix(in oklab, ${primary} 65%, #241820)`,
    '--color-accent-soft': `color-mix(in oklab, ${primary} 12%, #ffffff)`,
  } as CSSProperties
}

export default function ClinicTheme({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  const nombre = me?.clinica.nombre

  useEffect(() => {
    if (nombre) document.title = nombre
  }, [nombre])

  return <div style={brandVars(me?.clinica.color_primary)}>{children}</div>
}
