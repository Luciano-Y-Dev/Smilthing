import type { CSSProperties } from 'react'

export const adminThemeVars = {
  '--color-canvas': '#0c0a0a',
  '--color-surface': 'rgba(255,255,255,0.03)',
  '--color-panel': '#171214',
  '--color-ink': '#f3ecec',
  '--color-muted': '#a8989e',
  '--color-accent': '#c97f8d',
  '--color-accent-strong': '#c97f8d',
  '--color-accent-soft': 'rgba(201,127,141,0.14)',
  '--color-on-accent': '#2b1c21',
  '--color-divider': 'rgba(255,255,255,0.08)',
  '--color-info': '#8aa4e0',
  '--color-info-soft': 'rgba(138,164,224,0.12)',
  '--color-success': '#6fbf90',
  '--color-success-soft': 'rgba(111,191,144,0.12)',
  '--color-danger': '#d97373',
  '--color-danger-solid': '#b54848',
  '--color-danger-soft': 'rgba(207,100,100,0.13)',
} as CSSProperties

// Tarjeta translúcida para el dashboard (stats/tabla), donde no hay campos de formulario.
export const glassCard =
  'rounded-[14px] border border-white/10 bg-white/[0.04]'

// Fondo opaco para paneles y diálogos con formularios: evita que los campos
// (bg-canvas) y los bordes semitransparentes se peleen con las capas de cristal.
export const solidPanel =
  'rounded-[14px] border border-white/10 bg-[#151012]'

export const adminEase = 'cubic-bezier(0.32,0.72,0,1)'

export const ctaClass =
  'bg-accent-strong text-[var(--color-on-accent)] transition-all hover:bg-accent-strong/85 active:scale-[0.98] shadow-[0_10px_30px_-10px_rgba(201,127,141,0.6)]'

export const CURRENCY = 'USD'

export function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
