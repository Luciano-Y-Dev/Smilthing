import { useMemo, useState } from 'react'
import {
  Infinity as InfinityIcon,
  Palette,
  PencilSimple,
  Plus,
  Power,
  Receipt,
  Trash,
} from '@phosphor-icons/react'
import type { ClinicaAdminRow } from '../../api/admin'
import { ctaClass, glassCard, formatDate, money } from '../theme'
import PlatformMark from '../../components/PlatformMark'

export type EditorTab = 'datos' | 'marca' | 'pagos'

const estadoLabel: Record<string, string> = {
  trial: 'Trial',
  activo: 'Activo',
  suspendido: 'Suspendido',
  gratis: '∞ Gratis',
}

const estadoClass: Record<string, string> = {
  trial: 'bg-accent-soft text-accent',
  activo: 'bg-success-soft text-success',
  suspendido: 'bg-danger-soft text-danger',
  gratis: 'bg-info-soft text-info',
}

const filtros = ['todos', 'trial', 'activo', 'gratis', 'suspendido'] as const
type Filtro = (typeof filtros)[number]

const filtroLabel: Record<Filtro, string> = {
  todos: 'Todas',
  trial: 'Trial',
  activo: 'Activas',
  gratis: '∞ Gratis',
  suspendido: 'Suspendidas',
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${estadoClass[estado] ?? 'bg-white/5 text-muted'}`}
    >
      {estadoLabel[estado] ?? estado}
    </span>
  )
}

function ClinicThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <PlatformMark className="h-4 w-4 text-muted" />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-0.5"
    />
  )
}

interface ClinicTableProps {
  clinicas: ClinicaAdminRow[]
  loading: boolean
  busy: boolean
  onEdit: (clinica: ClinicaAdminRow, tab: EditorTab) => void
  onToggleEstado: (clinica: ClinicaAdminRow) => void
  onToggleGratis: (clinica: ClinicaAdminRow) => void
  onDelete: (clinica: ClinicaAdminRow) => void
  onNueva: () => void
}

export default function ClinicTable({
  clinicas,
  loading,
  busy,
  onEdit,
  onToggleEstado,
  onToggleGratis,
  onDelete,
  onNueva,
}: ClinicTableProps) {
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clinicas.filter(c => {
      const matchesFiltro = filtro === 'todos' || c.estado === filtro
      const matchesQuery =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        (c.email_admin ?? '').toLowerCase().includes(q)
      return matchesFiltro && matchesQuery
    })
  }, [clinicas, query, filtro])

  return (
    <div className={`admin-rise ${glassCard} flex min-h-0 flex-1 flex-col overflow-hidden`}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/[0.08] px-5 py-4">
        <h2 className="mr-auto text-base font-bold text-ink">Clínicas</h2>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent sm:w-64"
        />
        <div className="flex flex-wrap gap-1">
          {filtros.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-colors ${
                filtro === f
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              {filtroLabel[f]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onNueva}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold ${ctaClass}`}
        >
          <Plus size={16} weight="bold" />
          Nueva clínica
        </button>
      </div>

      {loading ? (
        <div className="flex-1 space-y-2 px-5 py-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="flex-1 px-5 py-6 text-sm text-muted">
          {clinicas.length === 0
            ? 'No hay clínicas todavía.'
            : 'Ninguna clínica coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3 font-semibold">Clínica</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3 font-semibold">Trial</th>
                <th className="px-3 py-3 font-semibold">Pacientes</th>
                <th className="px-3 py-3 font-semibold">Pagado</th>
                <th className="px-3 py-3 font-semibold">Último pago</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ClinicThumb src={c.logo_url} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-ink">
                          {c.nombre}
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                            style={{
                              background: c.color_primary ?? '#c97f8d',
                            }}
                          />
                        </p>
                        <p className="truncate text-xs text-muted">
                          {c.email_admin ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <EstadoBadge estado={c.estado} />
                  </td>
                  <td className="px-3 py-3 text-muted">{formatDate(c.trial_expires)}</td>
                  <td className="px-3 py-3 text-muted tabular-nums">{c.pacientes}</td>
                  <td className="px-3 py-3 text-muted tabular-nums">
                    {money(c.total_pagado)}
                  </td>
                  <td className="px-3 py-3 text-muted">{formatDate(c.ultimo_pago)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(c, 'datos')}
                        title="Editar"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-all hover:bg-white/5 hover:text-ink active:scale-[0.98]"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggleEstado(c)}
                        title={c.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                          c.estado === 'suspendido'
                            ? 'text-success hover:bg-success-soft'
                            : 'text-muted hover:bg-danger-soft hover:text-danger'
                        }`}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggleGratis(c)}
                        title={
                          c.estado === 'gratis'
                            ? 'Quitar gratuidad (volver a activa)'
                            : 'Hacer gratis para siempre'
                        }
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                          c.estado === 'gratis'
                            ? 'bg-info-soft text-info'
                            : 'text-muted hover:bg-info-soft hover:text-info'
                        }`}
                      >
                        <InfinityIcon size={18} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c, 'pagos')}
                        title="Pagos"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-all hover:bg-info-soft hover:text-info active:scale-[0.98]"
                      >
                        <Receipt size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c, 'marca')}
                        title="Marca"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-all hover:bg-accent-soft hover:text-accent active:scale-[0.98]"
                      >
                        <Palette size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(c)}
                        title="Eliminar"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-all hover:bg-danger-soft hover:text-danger active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
