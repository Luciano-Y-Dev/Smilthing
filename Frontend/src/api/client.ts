import type {
  Patient,
  PatientWithBalance,
  MedicalHistory,
  OralExam,
  Odontogram,
  OdontogramDetail,
  Treatment,
  Payment,
  Cita,
  CitaEstado,
  SaveCitaInput,
} from '../types'

export interface PatientFull {
  patient: Patient
  medicalHistory: MedicalHistory | null
  oralExam: OralExam | null
  odontogram: Odontogram | null
  odontogramDetails: OdontogramDetail[]
  treatments: Treatment[]
  remaining: number
}

export interface OdontogramAffection {
  tooth: number
  face: string
  affected: string
  description: string | null
}

export function detailsToAffections(
  details: OdontogramDetail[],
): OdontogramAffection[] {
  return details.flatMap(d => {
    if (d.tooth == null) return []
    const tooth = d.tooth
    const faces = d.face ? [d.face] : ['V', 'O', 'L', 'M', 'D']
    return faces.map(face => ({
      tooth,
      face,
      affected: d.affected,
      description: d.description,
    }))
  })
}

export interface SavePatientInput {
  id?: number
  name: string
  lastName: string
  age: number
  CI: string
  entryDate: string
  phoneNumber?: string | null
  home?: string | null
  representName?: string | null
  representCI?: string | null
  consultReason?: string | null
  presentIssues?: string | null
  medicalHistory?: Omit<MedicalHistory, 'id' | 'patientID'> | null
  oralExam?: Omit<OralExam, 'id' | 'patientID'> | null
  odontogram?: { notes: string; affections: OdontogramAffection[] } | null
  payment?: { treatmentCost: number; amount: number; description: string } | null
}

export interface SavePaymentInput {
  amount: number
  date: string
  description: string
}

export interface SaveTreatmentInput {
  diagnosis: string
  date: string
}

export interface ClinicaInfo {
  id: number
  nombre: string
  estado: string
  trial_expires: string | null
  logo_url: string | null
  color_primary: string | null
}

export interface UsuarioInfo {
  id: number
  email: string
  rol: string
  must_change_password: boolean
}

export interface MeResponse {
  clinica: ClinicaInfo
  usuario: UsuarioInfo
  dias_restantes: number | null
}

export interface Api {
  getPatients(): Promise<PatientWithBalance[]>
  getPatientsPending(): Promise<PatientWithBalance[]>
  getPaymentsPaid(): Promise<PatientWithBalance[]>
  getPatient(id: number): Promise<Patient | null>
  getPatientFull(id: number): Promise<PatientFull | null>
  savePatient(input: SavePatientInput): Promise<number>
  deletePatient(id: number): Promise<boolean>
  filterPatients(searchText?: string, dateFrom?: string, dateTo?: string): Promise<PatientWithBalance[]>
  getPayments(patientId: number): Promise<Payment[]>
  savePayment(patientId: number, input: SavePaymentInput): Promise<Payment>
  updatePayment(patientId: number, paymentId: number, input: SavePaymentInput): Promise<Payment>
  deletePayment(patientId: number, paymentId: number): Promise<boolean>
  getTreatments(patientId: number): Promise<Treatment[]>
  saveTreatment(patientId: number, input: SaveTreatmentInput): Promise<Treatment>
  updateTreatment(patientId: number, treatmentId: number, input: SaveTreatmentInput): Promise<Treatment>
  deleteTreatment(patientId: number, treatmentId: number): Promise<boolean>
  getCitas(desde: string, hasta: string): Promise<Cita[]>
  saveCita(input: SaveCitaInput): Promise<Cita>
  updateCita(citaId: number, input: SaveCitaInput): Promise<Cita>
  setCitaEstado(citaId: number, estado: CitaEstado): Promise<Cita>
  deleteCita(citaId: number): Promise<boolean>
  ciExists(ci: string, excludePatientId?: number): Promise<boolean>
  me(): Promise<MeResponse | null>
  login(email: string, password: string): Promise<MeResponse>
  logout(): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  downloadPatientPdf(id: number): Promise<void>
  exportPdf(ids: number[]): Promise<void>
  downloadBackup(): Promise<void>
  restoreBackup(file: File): Promise<void>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface ValidationDetail {
  loc?: unknown
  ctx?: { min_length?: number }
}

function validationMessage(detail: unknown[]): string {
  const first = detail[0] as ValidationDetail | undefined
  if (!first || typeof first !== 'object') return 'Datos inválidos.'
  const loc = Array.isArray(first.loc) ? first.loc : []
  const field = String(loc[loc.length - 1] ?? '')
  const min = first.ctx?.min_length
  if (typeof min === 'number') {
    return `El campo ${field || 'indicado'} debe tener al menos ${min} caracteres.`
  }
  return `Revisá el campo ${field || 'indicado'}.`
}

export async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    const detail = body?.detail
    if (Array.isArray(detail)) {
      return new ApiError(res.status, 'validacion', validationMessage(detail))
    }
    if (detail && typeof detail === 'object') {
      const obj = detail as { code?: unknown; message?: unknown; errors?: unknown }
      if (Array.isArray(obj.errors) && obj.errors.length > 0) {
        return new ApiError(
          res.status,
          String(obj.code ?? 'validacion'),
          validationMessage(obj.errors),
        )
      }
      return new ApiError(
        res.status,
        String(obj.code ?? 'error'),
        String(obj.message ?? 'Error.'),
      )
    }
  } catch {
    // cuerpo no JSON
  }
  return new ApiError(res.status, 'error', 'Error.')
}

function reportAuthError(err: ApiError): void {
  if (err.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'))
    return
  }
  if (
    err.status === 403 &&
    (err.code === 'cuenta_suspendida' || err.code === 'trial_vencido')
  ) {
    window.dispatchEvent(
      new CustomEvent('auth:blocked', {
        detail: { code: err.code, message: err.message },
      }),
    )
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) {
    const err = await parseError(res)
    reportAuthError(err)
    throw err
  }
  return (await res.json()) as T
}

export function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function downloadBlob(path: string, filename: string): Promise<void> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    const err = await parseError(res)
    reportAuthError(err)
    throw err
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const jsonBody = (data: unknown): Pick<RequestInit, 'method' | 'headers' | 'body'> => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

export const httpApi: Api = {
  getPatients: () => request('/api/pacientes'),

  getPatientsPending: () => request('/api/pacientes/pendientes'),

  getPaymentsPaid: () => request('/api/pacientes/pagados'),

  async getPatient(id) {
    try {
      return await request(`/api/pacientes/${id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },

  async getPatientFull(id) {
    try {
      return await request(`/api/pacientes/${id}/completo`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },

  savePatient: input => request('/api/pacientes', jsonBody(input)),

  deletePatient: id =>
    request(`/api/pacientes/${id}`, { method: 'DELETE' }),

  filterPatients: (searchText, dateFrom, dateTo) =>
    request(
      `/api/pacientes/filtro${qs({ searchText, dateFrom, dateTo })}`,
    ),

  getPayments: patientId =>
    request(`/api/pacientes/${patientId}/abonos`),

  savePayment: (patientId, input) =>
    request(`/api/pacientes/${patientId}/abonos`, jsonBody(input)),

  updatePayment: (patientId, paymentId, input) =>
    request(`/api/pacientes/${patientId}/abonos/${paymentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  async deletePayment(patientId, paymentId) {
    await request(`/api/pacientes/${patientId}/abonos/${paymentId}`, {
      method: 'DELETE',
    })
    return true
  },

  getTreatments: patientId =>
    request(`/api/pacientes/${patientId}/tratamientos`),

  saveTreatment: (patientId, input) =>
    request(`/api/pacientes/${patientId}/tratamientos`, jsonBody(input)),

  updateTreatment: (patientId, treatmentId, input) =>
    request(`/api/pacientes/${patientId}/tratamientos/${treatmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  deleteTreatment: (patientId, treatmentId) =>
    request(`/api/pacientes/${patientId}/tratamientos/${treatmentId}`, {
      method: 'DELETE',
    }),

  getCitas: (desde, hasta) =>
    request(`/api/citas${qs({ desde, hasta })}`),

  saveCita: input => request('/api/citas', jsonBody(input)),

  updateCita: (citaId, input) =>
    request(`/api/citas/${citaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  setCitaEstado: (citaId, estado) =>
    request(`/api/citas/${citaId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    }),

  async deleteCita(citaId) {
    await request(`/api/citas/${citaId}`, { method: 'DELETE' })
    return true
  },

  ciExists: (ci, excludePatientId) =>
    request(
      `/api/pacientes/ci-existe${qs({ ci, excludePatientId: excludePatientId?.toString() })}`,
    ),

  async me() {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.status === 401) return null
    if (!res.ok) throw await parseError(res)
    return (await res.json()) as MeResponse
  },

  login: (email, password) =>
    request('/api/auth/login', jsonBody({ email, password })),

  async logout() {
    await request('/api/auth/logout', { method: 'POST' })
  },

  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/cuenta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),

  downloadPatientPdf: id =>
    downloadBlob(`/api/pacientes/${id}/pdf`, `paciente_${id}.pdf`),

  exportPdf: ids =>
    downloadBlob(`/api/export/pdf${qs({ ids: ids.join(',') })}`, 'pacientes.pdf'),

  downloadBackup: () => downloadBlob('/api/backup/descargar', 'respaldo.zip'),

  async restoreBackup(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/backup/restaurar', {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await parseError(res)
      reportAuthError(err)
      throw err
    }
  },
}
