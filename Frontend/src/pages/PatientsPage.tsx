import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, UserPlus } from '@phosphor-icons/react'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import PatientCard from '../components/PatientCard'
import type { PatientWithBalance } from '../types'

const today = new Date().toISOString().slice(0, 10)

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientWithBalance[] | null>(null)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showDates, setShowDates] = useState(false)
  const [dateFrom, setDateFrom] = useState('2020-01-01')
  const [dateTo, setDateTo] = useState(today)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PatientWithBalance | null>(
    null,
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchText(searchInput.trim()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let active = true
    api
      .getPatients()
      .then(data => {
        if (active) setTotal(data.length)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    let active = true
    api
      .filterPatients(
        searchText,
        showDates ? dateFrom : undefined,
        showDates ? dateTo : undefined,
      )
      .then(data => {
        if (!active) return
        setPatients(data)
        setLoadError(null)
      })
      .catch(e => {
        if (!active) return
        setLoadError(
          e instanceof Error ? e.message : 'No se pudieron cargar los pacientes.',
        )
      })
    return () => {
      active = false
    }
  }, [searchText, showDates, dateFrom, dateTo, reloadKey])

  const toggleDates = () => {
    setShowDates(prev => {
      if (prev) {
        setDateFrom('2020-01-01')
        setDateTo(today)
      }
      return !prev
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await api.deletePatient(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteError(null)
      setReloadKey(k => k + 1)
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : 'No se pudo eliminar el paciente.',
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  const hasPatients = (patients?.length ?? 0) > 0
  const isFiltering =
    searchText !== '' || showDates || dateFrom !== '2020-01-01' || dateTo !== today

  const addPatient = () => navigate('/pacientes/nuevo')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Pacientes
        </h1>
        <button
          type="button"
          onClick={addPatient}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
        >
          <UserPlus size={18} weight="bold" />
          Añadir Paciente
        </button>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex h-11 min-w-52 flex-1 items-center gap-2.5 rounded-xl bg-surface px-4 shadow-soft focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-accent">
          <MagnifyingGlass size={17} className="shrink-0 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, apellido o CI..."
            aria-label="Buscar pacientes"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
        <button
          type="button"
          onClick={toggleDates}
          className={`h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold shadow-soft transition-colors ${
            showDates
              ? 'bg-accent-soft text-accent-strong'
              : 'bg-surface text-muted hover:text-ink'
          }`}
        >
          Fechas
        </button>
        {isFiltering && patients && patients.length !== total && (
          <span className="text-sm text-muted">
            Mostrando {patients.length} de {total} pacientes
          </span>
        )}
      </div>

      {showDates && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Desde:
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-10 cursor-pointer rounded-xl bg-surface px-3 text-sm text-ink shadow-soft outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Hasta:
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-10 cursor-pointer rounded-xl bg-surface px-3 text-sm text-ink shadow-soft outline-none"
            />
          </label>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            className="cursor-pointer font-semibold underline-offset-2 hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {patients === null && !loadError ? (
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-1 pb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-[20px] bg-surface shadow-soft" />
          ))}
        </div>
      ) : hasPatients ? (
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-1 pb-6">
          {patients?.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => navigate(`/pacientes/${patient.id}`)}
              onEdit={() => navigate(`/pacientes/${patient.id}/editar`)}
              onAddTreatment={() => navigate(`/pacientes/${patient.id}/editar`)}
              onDelete={() => setDeleteTarget(patient)}
            />
          ))}
        </div>
      ) : (
        patients && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
              <UserPlus size={28} weight="bold" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-ink">
                {isFiltering
                  ? 'No se encontraron pacientes'
                  : 'No hay registros aún :)'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isFiltering
                  ? 'Prueba con otros filtros de búsqueda'
                  : 'Añade tu primer paciente para comenzar'}
              </p>
            </div>
            {!isFiltering && (
              <button
                type="button"
                onClick={addPatient}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98]"
              >
                <UserPlus size={18} weight="bold" />
                Añadir Paciente
              </button>
            )}
          </div>
        )
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar a ${deleteTarget.name} ${deleteTarget.lastName}?\nEsta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          error={deleteError}
          busy={deleteBusy}
          onCancel={() => {
            if (!deleteBusy) {
              setDeleteTarget(null)
              setDeleteError(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}
