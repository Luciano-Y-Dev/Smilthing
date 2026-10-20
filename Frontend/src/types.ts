export interface Patient {
  id: number
  name: string
  lastName: string
  age: number
  CI: string
  entryDate: string
  phoneNumber: string | null
  home: string | null
  representName: string | null
  representCI: string | null
  consultReason: string | null
  presentIssues: string | null
}

export interface PatientWithBalance extends Patient {
  remaining: number
}

export interface MedicalHistory {
  id: number
  patientID: number
  earNoseThroat: string | null
  respiratory: string | null
  allergy: string | null
  cardiovascular: string | null
  gastrointestinal: string | null
  endocrine: string | null
  renal: string | null
  hepatic: string | null
  neurologic: string | null
  neoplastic: string | null
  blood: string | null
  viral: string | null
  gynecologic: string | null
  covid: string | null
  hiv: string | null
  surgeries: string | null
  medications: string | null
  hepatitisVaccine: string | null
  covidVaccine: string | null
  familyHistory: string | null
}

export interface OralExam {
  id: number
  patientID: number
  extraoral: string | null
  intraoralTB: string | null
  intraoralTD: string | null
  periodontal: string | null
  PA: string | null
}

export interface Odontogram {
  id: number
  patientID: number
  notes: string | null
}

export interface OdontogramDetail {
  id: number
  odontogramID: number
  tooth: number | null
  face: string | null
  affected: string
  description: string | null
}

export interface Treatment {
  id: number
  patientID: number
  diagnosis: string | null
  treatmentPlan: string | null
  date: string | null
}

export interface Payment {
  id: number
  patientID: number
  date: string | null
  description: string | null
  treatmentCost: number
  amount: number
  remaining: number
}

export type CitaEstado =
  | 'pendiente'
  | 'completada'
  | 'cancelada'
  | 'no_presento'

export interface Cita {
  id: number
  patientID: number
  patientName: string
  fecha: string
  hora: string
  duracionMin: number
  estado: CitaEstado
  notas: string | null
}

export interface SaveCitaInput {
  patientID: number
  fecha: string
  hora: string
  duracionMin: number
  notas: string
}
