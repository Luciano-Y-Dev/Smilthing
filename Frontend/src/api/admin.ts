import { jsonBody, parseError } from './client'

export interface SuperInfo {
  id: number
  email: string
}

export interface ClinicaAdminRow {
  id: number
  nombre: string
  estado: string
  trial_expires: string | null
  created_at: string
  email_admin: string | null
  pacientes: number
  total_pagado: number
  ultimo_pago: string | null
  logo_url: string | null
  color_primary: string | null
}

export interface AdminClinicaCreate {
  nombre: string
  email: string
  password: string
  dias_trial?: number | null
  color_primary?: string | null
}

export interface AdminClinicaUpdate {
  estado?: 'trial' | 'activo' | 'suspendido' | 'gratis'
  dias_trial?: number
  color_primary?: string | null
  nombre?: string
  email?: string
  password?: string
}

export interface LogoInfo {
  url: string
}

export interface AdminPago {
  id: number
  clinica_id: number
  monto: number
  fecha: string
  periodo_desde: string | null
  periodo_hasta: string | null
  referencia: string | null
  notas: string | null
}

export interface AdminPagoInput {
  monto: number
  fecha: string
  periodo_desde?: string | null
  periodo_hasta?: string | null
  referencia?: string | null
  notas?: string | null
}

export interface EstadisticasAdmin {
  clinicas_total: number
  activas: number
  trial: number
  suspendidas: number
  pacientes_total: number
  ingresos_mes: number
  trials_por_vencer: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export const adminApi = {
  async me(): Promise<SuperInfo | null> {
    const res = await fetch('/api/admin/me', { credentials: 'include' })
    if (res.status === 401) return null
    if (!res.ok) throw await parseError(res)
    return (await res.json()) as SuperInfo
  },

  login: (email: string, password: string) =>
    request<SuperInfo>('/api/admin/login', jsonBody({ email, password })),

  logout: () => request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),

  listClinicas: () => request<ClinicaAdminRow[]>('/api/admin/clinicas'),

  createClinica: (input: AdminClinicaCreate) =>
    request<ClinicaAdminRow>('/api/admin/clinicas', jsonBody(input)),

  updateClinica: (id: number, input: AdminClinicaUpdate) =>
    request<{ ok: boolean }>(`/api/admin/clinicas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  deleteClinica: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/clinicas/${id}`, { method: 'DELETE' }),

  listPagos: (clinicaId: number) =>
    request<AdminPago[]>(`/api/admin/clinicas/${clinicaId}/pagos`),

  createPago: (clinicaId: number, input: AdminPagoInput) =>
    request<AdminPago>(`/api/admin/clinicas/${clinicaId}/pagos`, jsonBody(input)),

  deletePago: (pagoId: number) =>
    request<{ ok: boolean }>(`/api/admin/pagos/${pagoId}`, { method: 'DELETE' }),

  estadisticas: () => request<EstadisticasAdmin>('/api/admin/estadisticas'),

  async uploadLogo(clinicaId: number, file: File): Promise<LogoInfo> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/admin/clinicas/${clinicaId}/logo`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) throw await parseError(res)
    return (await res.json()) as LogoInfo
  },

  deleteLogo: (clinicaId: number) =>
    request<{ ok: boolean }>(`/api/admin/clinicas/${clinicaId}/logo`, {
      method: 'DELETE',
    }),
}
