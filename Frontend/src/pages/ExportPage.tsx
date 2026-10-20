import { useEffect, useState } from 'react'
import { DownloadSimple, MagnifyingGlass } from '@phosphor-icons/react'
import { api } from '../api'
import type { PatientWithBalance } from '../types'

const today = new Date().toISOString().slice(0, 10)

export default function ExportPage() {
  const [patients, setPatients] = useState<PatientWithBalance[] | null>(null)
  const [serverFiltered, setServerFiltered] = useState<PatientWithBalance[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showDates, setShowDates] = useState(false)
  const [dateFrom, setDateFrom] = useState('2020-01-01')
  const [dateTo, setDateTo] = useState(today)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [exportBusy, setExportBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const hasFilter = searchText !== '' || showDates

  useEffect(() => {
    const t = setTimeout(() => setSearchText(searchInput.trim()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let active = true
    api.getPatients().then(
      data => {
        if (!active) return
        setPatients(data)
        setLoadError(null)
      },
      e => {
        if (!active) return
        setLoadError(
          e instanceof Error ? e.message : 'No se pudieron cargar los pacientes.',
        )
      },
    )
    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!hasFilter) return
    let active = true
    api
      .filterPatients(
        searchText,
        showDates ? dateFrom : undefined,
        showDates ? dateTo : undefined,
      )
      .then(
        data => {
          if (active) setServerFiltered(data)
        },
        () => {},
      )
    return () => {
      active = false
    }
  }, [hasFilter, searchText, showDates, dateFrom, dateTo])

  const filtered = hasFilter ? serverFiltered : (patients ?? [])

  const toggleDates = () => {
    setShowDates(prev => {
      if (prev) {
        setDateFrom('2020-01-01')
        setDateTo(today)
      }
      return !prev
    })
  }

  const togglePatient = (id: number) => {
    setExportError(null)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const visibleIds = filtered.map(p => p.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))

  const toggleAll = () => {
    setExportError(null)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  const validSelected = patients
    ? [...selectedIds].filter(id => patients.some(p => p.id === id))
    : []
  const count = validSelected.length

  const exportPdf = async () => {
    setExportBusy(true)
    setExportError(null)
    try {
      await api.exportPdf(validSelected)
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : 'No se pudo generar el PDF.',
      )
    } finally {
      setExportBusy(false)
    }
  }

  const hasPatients = (patients?.length ?? 0) > 0
  const isFiltering =
    searchText !== '' || showDates || dateFrom !== '2020-01-01' || dateTo !== today

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Exportar Datos
        </h1>
        <button
          type="button"
          onClick={() => void exportPdf()}
          disabled={count === 0 || exportBusy}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent-strong px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadSimple size={18} weight="bold" />
          {exportBusy ? 'Generando…' : `Exportar PDF (${count})`}
        </button>
      </header>

      {exportError && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span className="flex-1">{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="cursor-pointer font-semibold underline-offset-2 hover:underline"
          >
            Cerrar
          </button>
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

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex h-11 min-w-52 flex-1 items-center gap-2.5 rounded-xl bg-surface px-4 shadow-soft focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-accent">
          <MagnifyingGlass size={17} className="shrink-0 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, apellido o CI..."
            aria-label="Buscar pacientes para exportar"
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
        <button
          type="button"
          onClick={toggleAll}
          disabled={filtered.length === 0}
          className="h-11 cursor-pointer rounded-xl border border-accent bg-surface px-4 text-sm font-semibold text-accent-strong transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allVisibleSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
        {isFiltering && filtered.length !== (patients?.length ?? 0) && (
          <span className="text-sm text-muted">
            Mostrando {filtered.length} de {patients?.length ?? 0} pacientes
          </span>
        )}
      </div>

      {patients === null && !loadError ? (
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-1 pb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-[74px] animate-pulse rounded-xl bg-surface shadow-soft" />
          ))}
        </div>
      ) : hasPatients ? (
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-1 pb-6">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              No se encontraron pacientes con esos filtros
            </p>
          )}
          {filtered.map(p => {
            const checked = selectedIds.has(p.id)
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-4 rounded-xl bg-surface px-5 py-4 shadow-soft transition-colors ${
                  checked ? 'ring-1 ring-accent' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePatient(p.id)}
                  className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {p.name} {p.lastName}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {p.age} años · CI: {p.CI} · {p.entryDate}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="text-lg font-bold text-ink">No hay pacientes registrados</p>
          <p className="text-sm text-muted">
            Añade pacientes para poder exportarlos
          </p>
        </div>
      )}
    </div>
  )
}
