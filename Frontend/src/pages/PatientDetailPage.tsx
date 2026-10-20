import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  FilePdf,
  Plus,
  Wallet,
} from '@phosphor-icons/react'
import { api } from '../api'
import type { PatientFull } from '../api/client'
import { detailsToAffections } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import Odontogram from '../components/Odontogram'
import { Field, Section } from '../components/ui'
import type { Payment } from '../types'

const ANTECEDENT_LABELS: [string, keyof NonNullable<PatientFull['medicalHistory']>][] = [
  ['Oídos / Nariz / Garganta', 'earNoseThroat'],
  ['Respiratorio', 'respiratory'],
  ['Alergias', 'allergy'],
  ['Cardiovascular', 'cardiovascular'],
  ['Gastrointestinal', 'gastrointestinal'],
  ['Endocrino', 'endocrine'],
  ['Renal', 'renal'],
  ['Hepático', 'hepatic'],
  ['Neurológico', 'neurologic'],
  ['Neoplásico', 'neoplastic'],
  ['Enfermedades de sangre', 'blood'],
  ['Viral', 'viral'],
  ['Ginecológico', 'gynecologic'],
  ['Covid', 'covid'],
  ['VIH', 'hiv'],
  ['Cirugías', 'surgeries'],
  ['Medicamentos', 'medications'],
  ['Vacuna Hepatitis', 'hepatitisVaccine'],
  ['Vacuna Covid', 'covidVaccine'],
  ['Historial Familiar', 'familyHistory'],
]

const SECTION_LINKS = [
  { id: 'ficha', label: 'Ficha' },
  { id: 'antecedentes', label: 'Antecedentes' },
  { id: 'odontograma', label: 'Odontograma' },
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'abonos', label: 'Abonos' },
] as const

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patientId = Number(id)
  const [data, setData] = useState<PatientFull | null>(null)
  const [abonos, setAbonos] = useState<Payment[] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [activeSection, setActiveSection] = useState('ficha')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    api.getPatientFull(patientId).then(
      full => {
        if (!active) return
        if (full) setData(full)
        else setNotFound(true)
      },
      e => {
        if (!active) return
        setLoadError(
          e instanceof Error ? e.message : 'No se pudo cargar la ficha.',
        )
      },
    )
    api.getPayments(patientId).then(
      payments => {
        if (active) setAbonos(payments)
      },
      () => {
        if (active) setAbonos([])
      },
    )
    return () => {
      active = false
    }
  }, [patientId])

  useEffect(() => {
    if (!data) return
    const root = scrollRef.current
    if (!root) return
    let raf = 0
    const updateActive = () => {
      raf = 0
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 12) {
        setActiveSection(SECTION_LINKS[SECTION_LINKS.length - 1].id)
        return
      }
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.4
      let current: string = SECTION_LINKS[0].id
      for (const { id } of SECTION_LINKS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      setActiveSection(current)
    }
    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(updateActive)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    updateActive()
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      root.removeEventListener('scroll', onScroll)
    }
  }, [data])

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.deletePatient(patientId)
      navigate('/pacientes')
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : 'No se pudo eliminar el paciente.',
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  const jumpTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const downloadPdf = async () => {
    setPdfBusy(true)
    setPdfError(null)
    try {
      await api.downloadPatientPdf(patientId)
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'No se pudo generar el PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-base font-semibold text-muted">
          Paciente no encontrado
        </p>
        <button
          type="button"
          onClick={() => navigate('/pacientes')}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:text-accent-strong"
        >
          <ArrowLeft size={16} weight="bold" />
          Volver
        </button>
      </div>
    )
  }

  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p role="alert" className="text-base font-semibold text-danger">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => navigate('/pacientes')}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:text-accent-strong"
          >
            <ArrowLeft size={16} weight="bold" />
            Volver
          </button>
        </div>
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="h-10 w-60 animate-pulse rounded-xl bg-surface" />
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[20px] bg-surface shadow-soft"
            />
          ))}
        </div>
      </div>
    )
  }

  const { patient, medicalHistory, oralExam, treatments, remaining } = data

  const antecedentes = medicalHistory
    ? ANTECEDENT_LABELS.flatMap(([label, key]) => {
        const val = medicalHistory[key]
        if (typeof val !== 'string' || !val) return []
        return [{ label, display: val.startsWith('Si - ') ? val.slice(5) : 'Sí' }]
      })
    : []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex shrink-0 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/pacientes')}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ArrowLeft size={16} weight="bold" />
          Volver
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {patient.name} {patient.lastName}
        </h1>
        <span className="text-sm tabular-nums text-muted">
          {patient.age} años · CI: {patient.CI}
        </span>

        {abonos !== null && abonos.length > 0 && (
          <button
            type="button"
            onClick={() => jumpTo('abonos')}
            title="Ver abonos"
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold tabular-nums shadow-soft transition-colors ${
              remaining > 0
                ? 'bg-accent-soft text-accent-strong hover:bg-accent/20'
                : 'bg-success-soft text-success'
            }`}
          >
            <Wallet size={14} weight="bold" />
            {remaining > 0 ? `Saldo: $${remaining.toFixed(2)}` : 'Saldado'}
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfBusy}
            className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FilePdf size={16} weight="bold" />
            {pdfBusy ? 'Generando…' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/citas?paciente=${patient.id}`)}
            className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:text-accent-strong"
          >
            <Calendar size={16} weight="bold" />
            Agendar cita
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pacientes/${patient.id}/editar`)}
            className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-success-soft px-4 text-sm font-semibold text-success transition-colors hover:bg-success hover:text-white"
          >
            <Plus size={16} weight="bold" />
            Añadir Tratamiento
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pacientes/${patient.id}/editar`)}
            className="h-10 cursor-pointer rounded-xl bg-accent-strong px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="h-10 cursor-pointer rounded-xl bg-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
          >
            Eliminar
          </button>
        </div>
      </header>

      {pdfError && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span className="flex-1">{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError(null)}
            className="cursor-pointer font-semibold underline-offset-2 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="-mx-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6"
      >
        <nav
          aria-label="Secciones de la ficha"
          className="sticky top-0 z-10 -mx-2 flex shrink-0 gap-1 overflow-x-auto bg-canvas px-2 py-2"
        >
          {SECTION_LINKS.map(s => (
            <button
              key={s.id}
              type="button"
              aria-current={activeSection === s.id ? 'true' : undefined}
              onClick={() => jumpTo(s.id)}
              className={`h-9 shrink-0 cursor-pointer rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                activeSection === s.id
                  ? 'bg-surface text-ink shadow-soft'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <Section id="ficha" title="Datos Personales">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <Field label="Nombre" value={patient.name} />
            <Field label="Apellido" value={patient.lastName} />
            <Field label="Edad" value={`${patient.age} años`} />
            <Field label="CI" value={patient.CI} />
            <Field label="Teléfono" value={patient.phoneNumber} />
            <Field label="Fecha de ingreso" value={patient.entryDate} />
            <div className="col-span-2 md:col-span-3">
              <Field label="Dirección" value={patient.home} />
            </div>
            <Field label="Representante" value={patient.representName} />
            <Field label="CI Rep." value={patient.representCI} />
            <div className="col-span-2 md:col-span-3">
              <Field label="Motivo de consulta" value={patient.consultReason} />
            </div>
            {patient.presentIssues && (
              <div className="col-span-2 md:col-span-3">
                <Field label="Sintomatología" value={patient.presentIssues} />
              </div>
            )}
          </div>
        </Section>

        <Section id="antecedentes" title="Antecedentes Personales">
          {antecedentes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {antecedentes.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-strong">
                    {item.label}
                  </span>
                  <span className="text-sm text-muted">{item.display}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin antecedentes registrados</p>
          )}
        </Section>

        <Section title="Examen Físico">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <Field label="Extraoral" value={oralExam?.extraoral} />
            <Field label="Intraoral TB" value={oralExam?.intraoralTB} />
            <Field label="Intraoral TD" value={oralExam?.intraoralTD} />
            <Field label="Periodontal" value={oralExam?.periodontal} />
            <Field label="PA" value={oralExam?.PA} />
          </div>
        </Section>

        <Section id="odontograma" title="Odontograma">
          {data.odontogramDetails.length > 0 ? (
            <>
              <Odontogram
                readOnly
                affections={detailsToAffections(data.odontogramDetails)}
              />
              {data.odontogram?.notes && (
                <p className="mt-4 text-sm text-ink">
                  Notas: {data.odontogram.notes}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Sin odontograma registrado</p>
          )}
        </Section>

        <Section id="tratamientos" title="Tratamiento">
          {treatments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {treatments.map(t => (
                <div
                  key={t.id}
                  className="rounded-xl bg-canvas px-4 py-3"
                >
                  <p className="text-xs font-bold tabular-nums text-accent-strong">
                    {t.date || 'Sin fecha'}
                  </p>
                  <p className="mt-1 text-sm text-ink">{t.diagnosis}</p>
                  {t.treatmentPlan && (
                    <p className="mt-1 text-sm text-muted">{t.treatmentPlan}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin tratamientos registrados</p>
          )}
          <button
            type="button"
            onClick={() => navigate(`/pacientes/${patient.id}/editar`)}
            className="mt-4 flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" />
            Añadir nuevo tratamiento
          </button>
        </Section>

        <Section id="abonos" title="Saldo y Abonos" icon={Wallet}>
          <p className="text-center text-3xl font-bold tabular-nums text-accent-strong">
            ${remaining.toFixed(2)}
          </p>
          {abonos && abonos.length > 0 ? (
            <div className="mt-4 flex flex-col">
              {abonos.map(a => (
                <div
                  key={a.id}
                  className="grid grid-cols-4 items-center gap-2 border-b border-divider py-2.5 text-sm last:border-b-0"
                >
                  <span className="tabular-nums text-muted">
                    {a.date || '—'}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">
                    ${a.amount.toFixed(2)}
                  </span>
                  <span className="truncate text-muted">
                    {a.description || '—'}
                  </span>
                  <span className="text-right tabular-nums text-accent-strong">
                    Resta: ${a.remaining.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Sin abonos registrados</p>
          )}
        </Section>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar a ${patient.name} ${patient.lastName}?\nEsta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          error={deleteError}
          busy={deleteBusy}
          onCancel={() => {
            if (!deleteBusy) {
              setShowDelete(false)
              setDeleteError(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}
