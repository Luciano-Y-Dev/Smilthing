import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Coin, Trash } from '@phosphor-icons/react'
import { adminApi, type AdminPago, type ClinicaAdminRow } from '../../api/admin'
import ConfirmDialog from '../../components/ConfirmDialog'
import { FormInput } from '../../components/ui'
import { ctaClass, formatDate, money } from '../theme'

export default function PagosPanel({ clinica }: { clinica: ClinicaAdminRow }) {
  const [pagos, setPagos] = useState<AdminPago[]>([])
  const [loading, setLoading] = useState(true)
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<AdminPago | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPagos(await adminApi.listPagos(clinica.id))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pagos.')
    } finally {
      setLoading(false)
    }
  }, [clinica.id])

  useEffect(() => {
    let active = true
    adminApi
      .listPagos(clinica.id)
      .then(
        data => {
          if (active) {
            setPagos(data)
            setError(null)
          }
        },
        e => {
          if (active) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar los pagos.')
          }
        },
      )
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [clinica.id])

  const addPago = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await adminApi.createPago(clinica.id, {
        monto: Number(monto),
        fecha,
        referencia: referencia.trim() || null,
        notas: notas.trim() || null,
      })
      setMonto('')
      setReferencia('')
      setNotas('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.')
    } finally {
      setBusy(false)
    }
  }

  const removePago = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await adminApi.deletePago(deleting.id)
      setDeleting(null)
      await reload()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar el pago.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Total pagado:{' '}
        <span className="font-semibold tabular-nums text-ink">
          {money(clinica.total_pagado)}
        </span>
      </p>

      <form onSubmit={addPago} className="grid grid-cols-2 gap-3">
        <FormInput
          label="Monto"
          type="number"
          min={1}
          step="any"
          required
          value={monto}
          onChange={e => setMonto(e.target.value)}
          placeholder="500000"
        />
        <FormInput
          label="Fecha"
          type="date"
          required
          value={fecha}
          onChange={e => setFecha(e.target.value)}
        />
        <FormInput
          label="Referencia"
          value={referencia}
          onChange={e => setReferencia(e.target.value)}
          placeholder="Transferencia N.º…"
        />
        <FormInput
          label="Notas"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Mensualidad"
        />
        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={busy || !monto}
            className={`h-10 cursor-pointer rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ctaClass}`}
          >
            {busy ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="border-t border-white/[0.08] pt-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map(i => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : pagos.length === 0 ? (
          <p className="text-sm text-muted">Sin pagos registrados.</p>
        ) : (
          <ul className="space-y-2">
            {pagos.map(pago => (
              <li
                key={pago.id}
                className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm"
              >
                <Coin size={16} className="shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums text-ink">
                    {money(pago.monto)}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {formatDate(pago.fecha)}
                    </span>
                  </p>
                  {(pago.referencia || pago.notas) && (
                    <p className="truncate text-xs text-muted">
                      {[pago.referencia, pago.notas].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setDeleting(pago)
                  }}
                  aria-label="Eliminar pago"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Eliminar pago"
          message={`¿Eliminar el pago de ${money(deleting.monto)} del ${formatDate(deleting.fecha)}?`}
          confirmLabel="Eliminar"
          error={deleteError}
          busy={deleteBusy}
          onCancel={() => {
            if (!deleteBusy) setDeleting(null)
          }}
          onConfirm={() => void removePago()}
        />
      )}
    </div>
  )
}
