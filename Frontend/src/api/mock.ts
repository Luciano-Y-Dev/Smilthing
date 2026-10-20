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
import type {
  Api,
  MeResponse,
  PatientFull,
  SavePatientInput,
  SavePaymentInput,
} from './client'
import { ApiError } from './client'

const delay = <T>(value: T, ms = 150): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(value), ms))

let nextPatientId = 6
let nextHistoryId = 6
let nextExamId = 6
let nextOdontogramId = 6
let nextDetailId = 10
let nextPaymentId = 10
let nextTreatmentId = 2
let nextCitaId = 1

const patients: Patient[] = [
  {
    id: 1,
    name: 'María',
    lastName: 'González',
    age: 34,
    CI: '20123456',
    entryDate: '2026-01-15',
    phoneNumber: '0414-1234567',
    home: 'Av. Bolívar, Edif. Las Palmeras, Pto. 4',
    representName: null,
    representCI: null,
    consultReason: 'Limpieza y control periódico',
    presentIssues: null,
  },
  {
    id: 2,
    name: 'José',
    lastName: 'Pérez',
    age: 8,
    CI: '30987654',
    entryDate: '2026-03-22',
    phoneNumber: '0424-5558899',
    home: 'Urb. El Rosal, Calle 3, Casa 12',
    representName: 'Carmen Pérez',
    representCI: '18765432',
    consultReason: 'Dolor en molar superior derecho',
    presentIssues: 'Fiebre leve desde hace 2 días',
  },
  {
    id: 3,
    name: 'Laura',
    lastName: 'Fernández',
    age: 45,
    CI: '10456789',
    entryDate: '2025-11-05',
    phoneNumber: '0412-9876543',
    home: 'Sector Centro, Carrera 5, Apto. 2B',
    representName: null,
    representCI: null,
    consultReason: 'Prótesis dental superior',
    presentIssues: 'Hipertensión controlada',
  },
  {
    id: 4,
    name: 'Carlos',
    lastName: 'Rodríguez',
    age: 28,
    CI: '25345678',
    entryDate: '2026-06-10',
    phoneNumber: '0416-2223344',
    home: 'Urb. Libertador, Av. 4, Casa 27',
    representName: null,
    representCI: null,
    consultReason: 'Blanqueamiento dental',
    presentIssues: null,
  },
  {
    id: 5,
    name: 'Ana',
    lastName: 'Martínez',
    age: 52,
    CI: '09876543',
    entryDate: '2026-08-01',
    phoneNumber: '0414-7778899',
    home: 'Los Samanes, Edif. Aurora, Apto. 9',
    representName: null,
    representCI: null,
    consultReason: 'Implante dental inferior',
    presentIssues: 'Diabetes tipo 2',
  },
]

const histories = new Map<number, MedicalHistory>()
const exams = new Map<number, OralExam>()
const odontograms = new Map<number, Odontogram>()
const odontogramDetails: OdontogramDetail[] = []
const treatments: Treatment[] = []
const payments: Payment[] = []
const citas: Cita[] = []

histories.set(2, {
  id: 1,
  patientID: 2,
  earNoseThroat: 'Si - Amigdalitis recurrente',
  respiratory: null,
  allergy: 'Si - Penicilina',
  cardiovascular: null,
  gastrointestinal: null,
  endocrine: null,
  renal: null,
  hepatic: null,
  neurologic: null,
  neoplastic: null,
  blood: null,
  viral: null,
  gynecologic: null,
  covid: 'Si',
  hiv: null,
  surgeries: null,
  medications: null,
  hepatitisVaccine: 'Si',
  covidVaccine: 'Si',
  familyHistory: 'Madre diabética',
})

exams.set(2, {
  id: 1,
  patientID: 2,
  extraoral: 'Sin alteraciones extraorales',
  intraoralTB: 'Caries en 55 y 64',
  intraoralTD: null,
  periodontal: 'Encías sanas',
  PA: 'Rx panorámica sin hallazgos',
})

odontograms.set(2, { id: 1, patientID: 2, notes: 'Caries oclusal en 55' })

odontogramDetails.push(
  { id: 1, odontogramID: 1, tooth: 55, face: 'Oclusal', affected: 'Caries', description: 'Caries moderada' },
  { id: 2, odontogramID: 1, tooth: 64, face: 'Oclusal', affected: 'Caries', description: null },
  { id: 3, odontogramID: 1, tooth: 75, face: 'Distal', affected: 'Sellante', description: null },
)

treatments.push({
  id: 1,
  patientID: 2,
  diagnosis: 'Caries dental en piezas 55 y 64',
  treatmentPlan: 'Obturación con resina en 55 y 64',
  date: '2026-03-22',
})

payments.push(
  { id: 1, patientID: 1, date: '2026-01-15', description: 'Limpieza', treatmentCost: 80, amount: 80, remaining: 0 },
  { id: 2, patientID: 2, date: '2026-03-22', description: 'Consulta inicial', treatmentCost: 150, amount: 50, remaining: 100 },
  { id: 3, patientID: 3, date: '2025-11-05', description: 'Plan prótesis', treatmentCost: 300, amount: 0, remaining: 300 },
  { id: 4, patientID: 4, date: '2026-06-10', description: 'Blanqueamiento', treatmentCost: 200, amount: 200, remaining: 0 },
  { id: 5, patientID: 5, date: '2026-08-01', description: 'Implante - 1er abono', treatmentCost: 500, amount: 300, remaining: 200 },
)

function remainingOf(patientId: number): number {
  const ordered = payments
    .filter(p => p.patientID === patientId)
    .sort((a, b) => b.id - a.id)
  return ordered[0]?.remaining ?? 0
}

function withBalance(p: Patient): PatientWithBalance {
  return { ...p, remaining: remainingOf(p.id) }
}

function sortByEntryDateDesc(list: Patient[]): Patient[] {
  return [...list].sort((a, b) => b.entryDate.localeCompare(a.entryDate))
}

function paymentsOf(patientId: number): Payment[] {
  return payments
    .filter(p => p.patientID === patientId)
    .sort((a, b) => b.id - a.id)
}

function recalculateChain(rows: Payment[]): Map<number, number> {
  let prev: number | null = null
  const map = new Map<number, number>()
  for (const a of rows) {
    const base: number = prev === null ? a.treatmentCost : prev
    const remaining: number = base - a.amount
    if (remaining < 0) {
      throw new Error('El cambio genera un saldo negativo en los abonos; revisa los montos.')
    }
    map.set(a.id, remaining)
    prev = remaining
  }
  return map
}

function saveOdontogram(patientId: number, odontogram: NonNullable<SavePatientInput['odontogram']>): number {
  const existing = [...odontograms.values()].find(o => o.patientID === patientId)
  const odontogramId = existing?.id ?? nextOdontogramId++

  if (existing) {
    existing.notes = odontogram.notes
  } else {
    odontograms.set(odontogramId, { id: odontogramId, patientID: patientId, notes: odontogram.notes })
  }

  for (let i = odontogramDetails.length - 1; i >= 0; i--) {
    if (odontogramDetails[i].odontogramID === odontogramId) {
      odontogramDetails.splice(i, 1)
    }
  }

  for (const aff of odontogram.affections) {
    odontogramDetails.push({
      id: nextDetailId++,
      odontogramID: odontogramId,
      tooth: aff.tooth,
      face: aff.face,
      affected: aff.affected,
      description: aff.description,
    })
  }

  return odontogramId
}

export const mockApi: Api = {
  getPatients() {
    return delay(sortByEntryDateDesc(patients).map(withBalance))
  },

  getPatientsPending() {
    return delay(
      sortByEntryDateDesc(patients)
        .map(withBalance)
        .filter(p => p.remaining > 0),
    )
  },

  getPaymentsPaid() {
    return delay(
      sortByEntryDateDesc(patients)
        .map(withBalance)
        .filter(p => p.remaining === 0),
    )
  },

  getPatient(id) {
    const patient = patients.find(p => p.id === id)
    return delay(patient ? { ...patient } : null)
  },

  getPatientFull(id) {
    const patient = patients.find(p => p.id === id)
    if (!patient) {
      return delay(null)
    }

    const odontogram = [...odontograms.values()].find(o => o.patientID === id) ?? null
    const data: PatientFull = {
      patient: { ...patient },
      medicalHistory: histories.get(id) ?? null,
      oralExam: exams.get(id) ?? null,
      odontogram: odontogram ? { ...odontogram } : null,
      odontogramDetails: odontogram
        ? odontogramDetails.filter(d => d.odontogramID === odontogram.id).map(d => ({ ...d }))
        : [],
      treatments: treatments
        .filter(t => t.patientID === id)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id - a.id)
        .map(t => ({ ...t })),
      remaining: remainingOf(id),
    }
    return delay(data)
  },

  savePatient(input) {
    if (input.id !== undefined) {
      const patient = patients.find(p => p.id === input.id)
      if (!patient) {
        return Promise.reject(new Error('El paciente no existe.'))
      }
      Object.assign(patient, {
        name: input.name,
        lastName: input.lastName,
        age: input.age,
        CI: input.CI,
        entryDate: input.entryDate,
        phoneNumber: input.phoneNumber ?? null,
        home: input.home ?? null,
        representName: input.representName ?? null,
        representCI: input.representCI ?? null,
        consultReason: input.consultReason ?? null,
        presentIssues: input.presentIssues ?? null,
      })

      if (input.medicalHistory !== undefined) {
        if (input.medicalHistory) {
          const existing = histories.get(patient.id)
          histories.set(patient.id, {
            ...input.medicalHistory,
            id: existing?.id ?? nextHistoryId++,
            patientID: patient.id,
          })
        } else {
          histories.delete(patient.id)
        }
      }

      if (input.oralExam !== undefined) {
        if (input.oralExam) {
          const existing = exams.get(patient.id)
          exams.set(patient.id, {
            ...input.oralExam,
            id: existing?.id ?? nextExamId++,
            patientID: patient.id,
          })
        } else {
          exams.delete(patient.id)
        }
      }

      if (input.odontogram) {
        saveOdontogram(patient.id, input.odontogram)
      }

      if (input.payment && paymentsOf(patient.id).length === 0) {
        const remaining = input.payment.treatmentCost - input.payment.amount
        payments.push({
          id: nextPaymentId++,
          patientID: patient.id,
          date: input.entryDate,
          description: input.payment.description,
          treatmentCost: input.payment.treatmentCost,
          amount: input.payment.amount,
          remaining,
        })
      }

      return delay(patient.id)
    }

    const id = nextPatientId++
    patients.push({
      id,
      name: input.name,
      lastName: input.lastName,
      age: input.age,
      CI: input.CI,
      entryDate: input.entryDate,
      phoneNumber: input.phoneNumber ?? null,
      home: input.home ?? null,
      representName: input.representName ?? null,
      representCI: input.representCI ?? null,
      consultReason: input.consultReason ?? null,
      presentIssues: input.presentIssues ?? null,
    })

    if (input.medicalHistory) {
      histories.set(id, { ...input.medicalHistory, id: nextHistoryId++, patientID: id })
    }

    if (input.oralExam) {
      exams.set(id, { ...input.oralExam, id: nextExamId++, patientID: id })
    }

    if (input.odontogram) {
      saveOdontogram(id, input.odontogram)
    }

    if (input.payment) {
      const remaining = input.payment.treatmentCost - input.payment.amount
      payments.push({
        id: nextPaymentId++,
        patientID: id,
        date: input.entryDate,
        description: input.payment.description,
        treatmentCost: input.payment.treatmentCost,
        amount: input.payment.amount,
        remaining,
      })
    }

    return delay(id)
  },

  deletePatient(id) {
    const index = patients.findIndex(p => p.id === id)
    if (index === -1) {
      return delay(false)
    }
    patients.splice(index, 1)
    histories.delete(id)
    exams.delete(id)

    const patientOdontograms = [...odontograms.values()].filter(o => o.patientID === id)
    for (const o of patientOdontograms) {
      for (let i = odontogramDetails.length - 1; i >= 0; i--) {
        if (odontogramDetails[i].odontogramID === o.id) {
          odontogramDetails.splice(i, 1)
        }
      }
      odontograms.delete(o.id)
    }

    for (let i = treatments.length - 1; i >= 0; i--) {
      if (treatments[i].patientID === id) {
        treatments.splice(i, 1)
      }
    }

    for (let i = payments.length - 1; i >= 0; i--) {
      if (payments[i].patientID === id) {
        payments.splice(i, 1)
      }
    }

    return delay(true)
  },

  filterPatients(searchText = '', dateFrom, dateTo) {
    const filtered = sortByEntryDateDesc(patients).filter(p => {
      let matchesSearch = true
      if (searchText) {
        const text = searchText.toLowerCase()
        matchesSearch =
          p.name.toLowerCase().includes(text) ||
          p.lastName.toLowerCase().includes(text) ||
          String(p.CI).includes(text)
      }

      let matchesDate = true
      if (p.entryDate && dateFrom && dateTo) {
        if (p.entryDate < dateFrom || p.entryDate > dateTo) {
          matchesDate = false
        }
      }

      return matchesSearch && matchesDate
    })
    return delay(filtered.map(withBalance))
  },

  getPayments(patientId) {
    return delay(paymentsOf(patientId).map(p => ({ ...p })))
  },

  savePayment(patientId, input: SavePaymentInput) {
    const ordered = paymentsOf(patientId)
    const lastRemaining = ordered[0]?.remaining ?? 0
    const treatmentCost = ordered[0]?.treatmentCost ?? 0
    const newRemaining = lastRemaining - input.amount

    if (newRemaining < 0) {
      return Promise.reject(new Error('El abono excede el saldo pendiente.'))
    }

    const payment: Payment = {
      id: nextPaymentId++,
      patientID: patientId,
      date: input.date,
      description: input.description,
      treatmentCost,
      amount: input.amount,
      remaining: newRemaining,
    }
    payments.push(payment)
    return delay({ ...payment })
  },

  updatePayment(patientId, paymentId, input) {
    const asc = [...paymentsOf(patientId)].reverse()
    const target = asc.find(a => a.id === paymentId)
    if (!target) {
      return Promise.reject(new Error('El abono no existe.'))
    }

    const newRows = asc.map(a => (a.id === paymentId ? { ...a, amount: input.amount } : a))
    const remainingMap = recalculateChain(newRows)

    const finalRows = newRows.map(a => ({
      ...a,
      date: a.id === paymentId ? input.date : a.date,
      description: a.id === paymentId ? input.description : a.description,
      remaining: remainingMap.get(a.id)!,
    }))

    for (const row of finalRows) {
      const stored = payments.find(p => p.id === row.id)
      if (stored) {
        stored.amount = row.amount
        stored.date = row.date
        stored.description = row.description
        stored.remaining = row.remaining
      }
    }

    const updated = payments.find(p => p.id === paymentId)
    return delay({ ...updated! })
  },

  deletePayment(patientId, paymentId) {
    const asc = [...paymentsOf(patientId)].reverse()
    if (!asc.some(a => a.id === paymentId)) {
      return Promise.reject(new Error('El abono no existe.'))
    }

    const rest = asc.filter(a => a.id !== paymentId)
    const remainingMap = recalculateChain(rest)

    for (let i = payments.length - 1; i >= 0; i--) {
      if (payments[i].id === paymentId) {
        payments.splice(i, 1)
      }
    }

    for (const p of payments) {
      if (remainingMap.has(p.id)) {
        p.remaining = remainingMap.get(p.id)!
      }
    }

    return delay(true)
  },

  getTreatments(patientId) {
    return delay(
      treatments
        .filter(t => t.patientID === patientId)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id - a.id)
        .map(t => ({ ...t })),
    )
  },

  saveTreatment(patientId, input) {
    if (!input.diagnosis.trim()) {
      return Promise.reject(new Error('El diagnóstico es obligatorio.'))
    }
    const treatment: Treatment = {
      id: nextTreatmentId++,
      patientID: patientId,
      diagnosis: input.diagnosis.trim(),
      treatmentPlan: null,
      date: input.date,
    }
    treatments.push(treatment)
    return delay({ ...treatment })
  },

  updateTreatment(patientId, treatmentId, input) {
    const treatment = treatments.find(
      t => t.id === treatmentId && t.patientID === patientId,
    )
    if (!treatment) {
      return Promise.reject(new Error('El tratamiento no existe.'))
    }
    if (!input.diagnosis.trim()) {
      return Promise.reject(new Error('El diagnóstico es obligatorio.'))
    }
    treatment.diagnosis = input.diagnosis.trim()
    treatment.date = input.date
    return delay({ ...treatment })
  },

  deleteTreatment(patientId, treatmentId) {
    const idx = treatments.findIndex(
      t => t.id === treatmentId && t.patientID === patientId,
    )
    if (idx === -1) {
      return Promise.reject(new Error('El tratamiento no existe.'))
    }
    treatments.splice(idx, 1)
    return delay(true)
  },

  getCitas(desde, hasta) {
    const filtered = citas
      .filter(c => c.fecha >= desde && c.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
      .map(c => ({ ...c }))
    return delay(filtered)
  },

  saveCita(input: SaveCitaInput) {
    const patient = patients.find(p => p.id === input.patientID)
    if (!patient) {
      return Promise.reject(new Error('El paciente no existe.'))
    }
    const overlap = citas.some(
      c =>
        c.fecha === input.fecha &&
        c.estado !== 'cancelada' &&
        c.hora === input.hora,
    )
    if (overlap) {
      return Promise.reject(
        new Error('Ya hay una cita que se solapa en ese horario.'),
      )
    }
    const cita: Cita = {
      id: nextCitaId++,
      patientID: input.patientID,
      patientName: `${patient.name} ${patient.lastName}`.trim(),
      fecha: input.fecha,
      hora: input.hora,
      duracionMin: input.duracionMin,
      estado: 'pendiente',
      notas: input.notas || null,
    }
    citas.push(cita)
    return delay({ ...cita })
  },

  updateCita(citaId, input) {
    const cita = citas.find(c => c.id === citaId)
    if (!cita) {
      return Promise.reject(new Error('La cita no existe.'))
    }
    const patient = patients.find(p => p.id === input.patientID)
    if (!patient) {
      return Promise.reject(new Error('El paciente no existe.'))
    }
    cita.patientID = input.patientID
    cita.patientName = `${patient.name} ${patient.lastName}`.trim()
    cita.fecha = input.fecha
    cita.hora = input.hora
    cita.duracionMin = input.duracionMin
    cita.notas = input.notas || null
    return delay({ ...cita })
  },

  setCitaEstado(citaId, estado: CitaEstado) {
    const cita = citas.find(c => c.id === citaId)
    if (!cita) {
      return Promise.reject(new Error('La cita no existe.'))
    }
    cita.estado = estado
    return delay({ ...cita })
  },

  deleteCita(citaId) {
    const idx = citas.findIndex(c => c.id === citaId)
    if (idx === -1) {
      return Promise.reject(new Error('La cita no existe.'))
    }
    citas.splice(idx, 1)
    return delay(true)
  },

  ciExists(ci, excludePatientId) {
    const found = patients.some(
      p => p.CI === ci && p.id !== excludePatientId,
    )
    return delay(found)
  },

  me() {
    return delay<MeResponse | null>({
      clinica: {
        id: 1,
        nombre: 'Clínica Demo',
        estado: 'trial',
        trial_expires: null,
        logo_url: null,
        color_primary: null,
      },
      usuario: {
        id: 1,
        email: 'demo@clinica.test',
        rol: 'admin',
        must_change_password: false,
      },
      dias_restantes: 25,
    })
  },

  login() {
    return mockApi.me() as Promise<MeResponse>
  },

  logout() {
    return delay(undefined)
  },

  changePassword() {
    return delay(undefined)
  },

  downloadPatientPdf() {
    return Promise.reject(
      new ApiError(501, 'requiere_backend', 'La generación de PDF es una función de backend.'),
    )
  },

  exportPdf() {
    return Promise.reject(
      new ApiError(501, 'requiere_backend', 'La generación de PDF es una función de backend.'),
    )
  },

  downloadBackup() {
    return Promise.reject(
      new ApiError(501, 'requiere_backend', 'Los respaldos son una función de backend.'),
    )
  },

  restoreBackup() {
    return Promise.reject(
      new ApiError(501, 'requiere_backend', 'Los respaldos son una función de backend.'),
    )
  },
}
