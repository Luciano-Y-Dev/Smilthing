import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { api } from '../api'
import type { OdontogramAffection, PatientFull } from '../api/client'
import { detailsToAffections } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import Odontogram from '../components/Odontogram'
import TratamientoDialog from '../components/TratamientoDialog'
import { FormInput, FormTextarea, Section } from '../components/ui'
import type { Treatment } from '../types'

const ANTECEDENT_FIELDS = [
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
] as const

type AntecedentKey = (typeof ANTECEDENT_FIELDS)[number][1]
type AntecedentsState = Record<AntecedentKey, { checked: boolean; context: string }>

type PendingTreatment = { tempId: number; diagnosis: string; date: string }

type TreatmentDialogState =
  | null
  | {
      initialText: string
      initialDate: string
      treatmentId?: number
      pendingIndex?: number
      error?: string | null
    }

const emptyAntecedents = (): AntecedentsState =>
  Object.fromEntries(
    ANTECEDENT_FIELDS.map(([, key]) => [key, { checked: false, context: '' }]),
  ) as AntecedentsState

export default function PatientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patientId = id ? Number(id) : null
  const isEdit = patientId !== null

  const [loaded, setLoaded] = useState(!isEdit)
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [ci, setCi] = useState('')
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [phone, setPhone] = useState('')
  const [home, setHome] = useState('')
  const [repName, setRepName] = useState('')
  const [repCi, setRepCi] = useState('')
  const [motivo, setMotivo] = useState('')
  const [sintomas, setSintomas] = useState('')
  const [antecedentes, setAntecedentes] = useState<AntecedentsState>(emptyAntecedents)
  const [extraoral, setExtraoral] = useState('')
  const [intraoralTB, setIntraoralTB] = useState('')
  const [intraoralTD, setIntraoralTD] = useState('')
  const [periodontal, setPeriodontal] = useState('')
  const [pa, setPa] = useState('')
  const [odontoNotes, setOdontoNotes] = useState('')
  const [odontogramAff, setOdontogramAff] = useState<OdontogramAffection[]>([])
  const [hadOdontogram, setHadOdontogram] = useState(false)
  const [cost, setCost] = useState('')
  const [abono, setAbono] = useState('')
  const [descAbono, setDescAbono] = useState('')
  const [hasAbonos, setHasAbonos] = useState(false)

  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [pending, setPending] = useState<PendingTreatment[]>([])
  const [treatmentDialog, setTreatmentDialog] = useState<TreatmentDialogState>(null)
  const [deleteTreatmentId, setDeleteTreatmentId] = useState<number | null>(null)
  const [deletePendingIndex, setDeletePendingIndex] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [treatmentSaving, setTreatmentSaving] = useState(false)
  const [deleteTratBusy, setDeleteTratBusy] = useState(false)
  const [ciDialogOpen, setCiDialogOpen] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  const dirtyRef = useRef(false)
  const skipDirtyRef = useRef(true)
  const createdIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!loaded) {
      skipDirtyRef.current = true
      return
    }
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false
      return
    }
    dirtyRef.current = true
  }, [
    loaded,
    name,
    lastName,
    age,
    ci,
    entryDate,
    phone,
    home,
    repName,
    repCi,
    motivo,
    sintomas,
    antecedentes,
    extraoral,
    intraoralTB,
    intraoralTD,
    periodontal,
    pa,
    odontoNotes,
    odontogramAff,
    cost,
    abono,
    descAbono,
    pending,
  ])

  useEffect(() => {
    if (!loaded) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [loaded])

  useEffect(() => {
    if (!isEdit) return
    let active = true
    Promise.all([
      api.getPatientFull(patientId!),
      api.getPayments(patientId!),
      api.getTreatments(patientId!),
    ]).then(
      ([full, payments, trats]) => {
        if (!active) return
        if (!full) {
          navigate('/pacientes')
          return
        }
        applyFullData(full)
        setHasAbonos(payments.length > 0)
        setTreatments(trats)
        setLoaded(true)
      },
      e => {
        if (!active) return
        setLoadError(
          e instanceof Error ? e.message : 'No se pudo cargar la ficha.',
        )
      },
    )
    return () => {
      active = false
    }
  }, [isEdit, patientId, navigate])

  const applyFullData = (full: PatientFull) => {
    const p = full.patient
    setName(p.name)
    setLastName(p.lastName)
    setAge(String(p.age))
    setCi(p.CI)
    setEntryDate(p.entryDate)
    setPhone(p.phoneNumber ?? '')
    setHome(p.home ?? '')
    setRepName(p.representName ?? '')
    setRepCi(p.representCI ?? '')
    setMotivo(p.consultReason ?? '')
    setSintomas(p.presentIssues ?? '')
    setExtraoral(full.oralExam?.extraoral ?? '')
    setIntraoralTB(full.oralExam?.intraoralTB ?? '')
    setIntraoralTD(full.oralExam?.intraoralTD ?? '')
    setPeriodontal(full.oralExam?.periodontal ?? '')
    setPa(full.oralExam?.PA ?? '')
    setOdontoNotes(full.odontogram?.notes ?? '')
    setHadOdontogram(full.odontogram !== null)
    setOdontogramAff(detailsToAffections(full.odontogramDetails))
    if (full.medicalHistory) {
      const next = emptyAntecedents()
      for (const [, key] of ANTECEDENT_FIELDS) {
        const val = full.medicalHistory[key]
        if (typeof val === 'string' && val) {
          next[key] = {
            checked: true,
            context: val.startsWith('Si - ') ? val.slice(5) : '',
          }
        }
      }
      setAntecedentes(next)
    }
  }

  const allTreatments = [
    ...treatments.map(t => ({
      key: `t-${t.id}` as string,
      date: t.date ?? 'Sin fecha',
      diagnosis: t.diagnosis ?? '',
      treatmentId: t.id as number | null,
      pendingIndex: null as number | null,
    })),
    ...pending.map((t, i) => ({
      key: `p-${t.tempId}`,
      date: t.date || 'Sin fecha',
      diagnosis: t.diagnosis,
      treatmentId: null as number | null,
      pendingIndex: i,
    })),
  ]

  const handleSaveTreatment = async (text: string, date: string) => {
    if (!text) {
      setTreatmentDialog(prev =>
        prev ? { ...prev, error: 'El diagnóstico es obligatorio.' } : prev,
      )
      return
    }
    setTreatmentSaving(true)
    try {
      if (treatmentDialog?.treatmentId != null) {
        await api.updateTreatment(
          patientId!,
          treatmentDialog.treatmentId,
          { diagnosis: text, date },
        )
        setTreatments(await api.getTreatments(patientId!))
      } else if (isEdit) {
        await api.saveTreatment(patientId!, { diagnosis: text, date })
        setTreatments(await api.getTreatments(patientId!))
      } else if (treatmentDialog?.pendingIndex != null) {
        setPending(prev =>
          prev.map((t, i) =>
            i === treatmentDialog.pendingIndex ? { ...t, diagnosis: text, date } : t,
          ),
        )
      } else {
        setPending(prev => [
          ...prev,
          { tempId: Date.now(), diagnosis: text, date },
        ])
      }
      setTreatmentDialog(null)
    } catch (e) {
      setTreatmentDialog(prev =>
        prev
          ? {
              ...prev,
              error: e instanceof Error ? e.message : 'No se pudo guardar.',
            }
          : prev,
      )
    } finally {
      setTreatmentSaving(false)
    }
  }

  const confirmDeleteTreatment = async () => {
    setDeleteTratBusy(true)
    try {
      if (deleteTreatmentId != null) {
        await api.deleteTreatment(patientId!, deleteTreatmentId)
        setTreatments(await api.getTreatments(patientId!))
        setDeleteTreatmentId(null)
      } else if (deletePendingIndex != null) {
        setPending(prev => prev.filter((_, i) => i !== deletePendingIndex))
        setDeletePendingIndex(null)
      }
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'No se pudo eliminar el tratamiento.',
      )
      setDeleteTreatmentId(null)
      setDeletePendingIndex(null)
    } finally {
      setDeleteTratBusy(false)
    }
  }

  const buildMedicalHistory = () => {
    const history: Record<string, string | null> = {}
    for (const [, key] of ANTECEDENT_FIELDS) {
      const { checked, context } = antecedentes[key]
      history[key] = checked ? (context ? `Si - ${context}` : 'Si') : null
    }
    return history
  }

  const doSave = async () => {
    setSaving(true)
    setFormError(null)
    try {
      const editId = isEdit ? patientId! : createdIdRef.current
      const newId = await api.savePatient({
        ...(editId != null ? { id: editId } : {}),
        name: name.trim(),
        lastName: lastName.trim(),
        age: Number(age),
        CI: ci.trim(),
        entryDate,
        phoneNumber: phone.trim() || null,
        home: home.trim() || null,
        representName: repName.trim() || null,
        representCI: repCi.trim() || null,
        consultReason: motivo.trim() || null,
        presentIssues: sintomas.trim() || null,
        medicalHistory: buildMedicalHistory() as never,
        oralExam: {
          extraoral: extraoral.trim() || null,
          intraoralTB: intraoralTB.trim() || null,
          intraoralTD: intraoralTD.trim() || null,
          periodontal: periodontal.trim() || null,
          PA: pa.trim() || null,
        },
        odontogram:
          odontoNotes.trim() || odontogramAff.length > 0
            ? { notes: odontoNotes.trim(), affections: odontogramAff }
            : hadOdontogram
              ? { notes: '', affections: [] }
              : null,
        payment:
          !hasAbonos && cost.trim()
            ? {
                treatmentCost: Number(cost) || 0,
                amount: Number(abono) || 0,
                description: descAbono.trim() || 'Abono inicial',
              }
            : null,
      })
      createdIdRef.current = newId
      const failed: PendingTreatment[] = []
      const results = await Promise.allSettled(
        pending.map(t =>
          api.saveTreatment(newId, { diagnosis: t.diagnosis, date: t.date }),
        ),
      )
      results.forEach((r, i) => {
        if (r.status === 'rejected') failed.push(pending[i])
      })
      if (failed.length > 0) {
        setPending(failed)
        throw new Error(
          'El paciente se guardó, pero fallaron algunos tratamientos. Pulsa Guardar para reintentarlos.',
        )
      }
      dirtyRef.current = false
      navigate('/pacientes')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setFormError(null)
    if (!name.trim() || !lastName.trim()) {
      setFormError('Nombre y apellido son obligatorios.')
      return
    }
    const ageNum = Number(age)
    if (!age.trim() || !Number.isInteger(ageNum) || ageNum <= 0) {
      setFormError('La edad debe ser un número entero positivo.')
      return
    }
    if (!ci.trim()) {
      setFormError('La cédula de identidad es obligatoria.')
      return
    }
    if (/^\d+$/.test(ci.trim())) {
      const exists = await api.ciExists(
        ci.trim(),
        patientId ?? createdIdRef.current ?? undefined,
      )
      if (exists) {
        setCiDialogOpen(true)
        return
      }
    }
    await doSave()
  }

  const handleBack = () => {
    if (dirtyRef.current) {
      setConfirmExit(true)
      return
    }
    navigate('/pacientes')
  }

  if (!loaded) {
    if (loadError) {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <span className="flex-1">{loadError}</span>
            <button
              type="button"
              onClick={() => navigate('/pacientes')}
              className="cursor-pointer font-semibold underline-offset-2 hover:underline"
            >
              Volver
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-surface" />
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-[20px] bg-surface shadow-soft"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ArrowLeft size={16} weight="bold" />
          Volver
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {isEdit ? 'Editar Ficha' : 'Nuevo Registro de Paciente'}
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ml-auto h-10 cursor-pointer rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </header>

      {formError && (
        <div
          role="alert"
          className="shrink-0 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {formError}
        </div>
      )}

      <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6">
        <Section title="Información Personal">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              placeholder="Nombre(es)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <FormInput
              placeholder="Apellido(s)"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
            <FormInput
              placeholder="Edad"
              inputMode="numeric"
              value={age}
              onChange={e => setAge(e.target.value)}
            />
            <FormInput
              placeholder="CI"
              value={ci}
              onChange={e => setCi(e.target.value)}
            />
            <FormInput
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
            <FormInput
              placeholder="Teléfono"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <div className="col-span-2">
              <FormInput
                placeholder="Dirección"
                value={home}
                onChange={e => setHome(e.target.value)}
              />
            </div>
            <FormInput
              placeholder="Representante (Si aplica)"
              value={repName}
              onChange={e => setRepName(e.target.value)}
            />
            <FormInput
              placeholder="CI Representante (Si aplica)"
              value={repCi}
              onChange={e => setRepCi(e.target.value)}
            />
            <div className="col-span-2">
              <FormInput
                placeholder="Motivo de Consulta"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <FormTextarea
                placeholder="Sintomatología Actual"
                value={sintomas}
                onChange={e => setSintomas(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Antecedentes Personales">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ANTECEDENT_FIELDS.map(([label, key]) => {
              const { checked, context } = antecedentes[key]
              return (
                <div
                  key={key}
                  className="rounded-xl bg-canvas p-3.5"
                >
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setAntecedentes(prev => ({
                          ...prev,
                          [key]: { ...prev[key], checked: e.target.checked },
                        }))
                      }
                      className="h-[18px] w-[18px] cursor-pointer accent-accent"
                    />
                    <span className="text-sm text-muted">{label}</span>
                  </label>
                  {checked && (
                    <div className="mt-2.5">
                      <FormTextarea
                        placeholder="Contexto..."
                        className="min-h-[60px]"
                        value={context}
                        onChange={e =>
                          setAntecedentes(prev => ({
                            ...prev,
                            [key]: { ...prev[key], context: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Examen Físico">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput
                placeholder="Extraoral"
                value={extraoral}
                onChange={e => setExtraoral(e.target.value)}
              />
            </div>
            <FormInput
              placeholder="Intraoral TB"
              value={intraoralTB}
              onChange={e => setIntraoralTB(e.target.value)}
            />
            <FormInput
              placeholder="Intraoral TD"
              value={intraoralTD}
              onChange={e => setIntraoralTD(e.target.value)}
            />
            <FormInput
              placeholder="Periodontal"
              value={periodontal}
              onChange={e => setPeriodontal(e.target.value)}
            />
            <FormInput
              placeholder="PA"
              value={pa}
              onChange={e => setPa(e.target.value)}
            />
          </div>
        </Section>

        <Section title="Odontograma">
          <Odontogram affections={odontogramAff} onChange={setOdontogramAff} />
          <div className="mt-4">
            <FormTextarea
              label="Observaciones generales del odontograma"
              placeholder="Observaciones generales del odontograma..."
              value={odontoNotes}
              onChange={e => setOdontoNotes(e.target.value)}
            />
          </div>
        </Section>

        <Section title="Tratamiento">
          {allTreatments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {allTreatments.map(t => (
                <div key={t.key} className="rounded-xl bg-canvas px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-accent-strong">
                      {t.date}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTreatmentDialog({
                            initialText: t.diagnosis,
                            initialDate:
                              t.date === 'Sin fecha' ? '' : t.date,
                            treatmentId: t.treatmentId ?? undefined,
                            pendingIndex: t.pendingIndex ?? undefined,
                          })
                        }
                        className="h-8 cursor-pointer rounded-lg bg-accent-strong px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-strong/85"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          t.treatmentId != null
                            ? setDeleteTreatmentId(t.treatmentId)
                            : setDeletePendingIndex(t.pendingIndex)
                        }
                        className="h-8 cursor-pointer rounded-lg bg-danger-soft px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
                      >
                        Eliminar
                      </button>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{t.diagnosis}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin tratamientos registrados</p>
          )}
          <button
            type="button"
            onClick={() =>
              setTreatmentDialog({ initialText: '', initialDate: '' })
            }
            className="mt-4 flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" />
            Añadir nuevo tratamiento
          </button>
        </Section>

        <Section title="Costo del Tratamiento">
          {isEdit && hasAbonos ? (
            <p className="whitespace-pre-line text-sm text-muted">
              {'Este paciente ya tiene pagos registrados.\nGestiona sus abonos desde la sección Abonos.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                placeholder="Costo total ($)"
                inputMode="decimal"
                value={cost}
                onChange={e => setCost(e.target.value)}
              />
              <FormInput
                placeholder="Abono inicial ($)"
                inputMode="decimal"
                value={abono}
                onChange={e => setAbono(e.target.value)}
              />
              <div className="col-span-2">
                <FormInput
                  placeholder="Descripción del abono"
                  value={descAbono}
                  onChange={e => setDescAbono(e.target.value)}
                />
              </div>
            </div>
          )}
        </Section>
      </div>

      {treatmentDialog && (
        <TratamientoDialog
          initialText={treatmentDialog.initialText}
          initialDate={treatmentDialog.initialDate}
          error={treatmentDialog.error}
          busy={treatmentSaving}
          onCancel={() => {
            if (!treatmentSaving) setTreatmentDialog(null)
          }}
          onSave={handleSaveTreatment}
        />
      )}

      {(deleteTreatmentId != null || deletePendingIndex != null) && (
        <ConfirmDialog
          title="Eliminar tratamiento"
          message="¿Eliminar este tratamiento? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          error={formError}
          busy={deleteTratBusy}
          onCancel={() => {
            if (!deleteTratBusy) {
              setDeleteTreatmentId(null)
              setDeletePendingIndex(null)
            }
          }}
          onConfirm={confirmDeleteTreatment}
        />
      )}

      {ciDialogOpen && (
        <ConfirmDialog
          title="CI duplicada"
          message={`Ya existe otro paciente registrado con la CI ${ci}.\n¿Guardar de todas formas?`}
          confirmLabel="Guardar"
          onCancel={() => setCiDialogOpen(false)}
          onConfirm={() => {
            setCiDialogOpen(false)
            doSave()
          }}
        />
      )}

      {confirmExit && (
        <ConfirmDialog
          title="Cambios sin guardar"
          message="Tienes cambios sin guardar en esta ficha. ¿Salir sin guardar?"
          confirmLabel="Salir sin guardar"
          cancelLabel="Seguir editando"
          onCancel={() => setConfirmExit(false)}
          onConfirm={() => {
            dirtyRef.current = false
            navigate('/pacientes')
          }}
        />
      )}
    </div>
  )
}
