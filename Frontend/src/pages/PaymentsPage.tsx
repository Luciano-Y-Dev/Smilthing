import { useEffect, useState } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { api } from '../api'
import AbonoDialog from '../components/AbonoDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import type { PatientWithBalance, Payment } from '../types'

const today = new Date().toISOString().slice(0, 10)
const money = (n: number) => `$${n.toFixed(2)}`

export default function PaymentsPage() {
  const [tab, setTab] = useState<'pending' | 'paid'>('pending')
  const [search, setSearch] = useState('')
  const [pendingList, setPendingList] = useState<PatientWithBalance[]>([])
  const [paidList, setPaidList] = useState<PatientWithBalance[]>([])
  const [selected, setSelected] = useState<PatientWithBalance | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)

  const loadLists = async () => {
    const [pend, pag] = await Promise.all([
      api.getPatientsPending(),
      api.getPaymentsPaid(),
    ])
    setPendingList(pend)
    setPaidList(pag)
    return { pend, pag }
  }

  useEffect(() => {
    let active = true
    Promise.all([
      api.getPatientsPending(),
      api.getPaymentsPaid(),
    ]).then(
      ([pend, pag]) => {
        if (!active) return
        setPendingList(pend)
        setPaidList(pag)
      },
      e => {
        if (!active) return
        setPageError(
          e instanceof Error ? e.message : 'No se pudieron cargar los abonos.',
        )
      },
    )
    return () => {
      active = false
    }
  }, [])

  const selectedId = selected?.id ?? null

  useEffect(() => {
    if (selectedId == null) return
    let active = true
    api.getPayments(selectedId).then(
      data => {
        if (active) setPayments(data)
      },
      e => {
        if (!active) return
        setPageError(
          e instanceof Error ? e.message : 'No se pudieron cargar los abonos.',
        )
      },
    )
    return () => {
      active = false
    }
  }, [selectedId])

  const reloadSelection = async () => {
    setPageError(null)
    const { pend, pag } = await loadLists()
    if (selectedId == null) return
    const fresh =
      pend.find(p => p.id === selectedId) ??
      pag.find(p => p.id === selectedId) ??
      null
    setSelected(fresh)
    setPayments(await api.getPayments(selectedId))
  }

  const switchTab = (next: 'pending' | 'paid') => {
    setTab(next)
    setSearch('')
    setSelected(null)
    setPayments([])
  }

  const visibleList = (tab === 'pending' ? pendingList : paidList).filter(p => {
    if (!search.trim()) return true
    const text = search.trim().toLowerCase()
    return (
      p.name.toLowerCase().includes(text) ||
      p.lastName.toLowerCase().includes(text) ||
      p.CI.includes(text)
    )
  })

  const selectPatient = (p: PatientWithBalance) => {
    setPageError(null)
    setSelected(p)
  }

  const handleAdd = async () => {
    if (!selected) return
    setAddError(null)
    const n = Number(amount)
    if (!amount.trim() || !Number.isFinite(n) || n <= 0) {
      setAddError('Ingresa un monto válido.')
      return
    }
    setBusy(true)
    try {
      await api.savePayment(selected.id, {
        amount: n,
        date,
        description: description.trim(),
      })
      setAmount('')
      setDescription('')
      setDate(today)
      await reloadSelection()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'No se pudo registrar el abono.')
    } finally {
      setBusy(false)
    }
  }

  const handleEditSave = async (newDate: string, newAmount: number, newDesc: string) => {
    if (!selected || !editing) return
    setDialogError(null)
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      setDialogError('Ingresa un monto válido.')
      return
    }
    setBusy(true)
    try {
      await api.updatePayment(selected.id, editing.id, {
        amount: newAmount,
        date: newDate,
        description: newDesc,
      })
      setEditing(null)
      await reloadSelection()
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'No se pudo actualizar el abono.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || !deleting) return
    setBusy(true)
    setPageError(null)
    try {
      await api.deletePayment(selected.id, deleting.id)
      setDeleting(null)
      await reloadSelection()
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'No se pudo eliminar el abono.')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  const ascending = [...payments].reverse()
  const isSelectedPaid = selected != null && selected.remaining <= 0

  const tabBase =
    'h-9 cursor-pointer rounded-xl px-4 text-sm font-semibold transition-colors'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex shrink-0 items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Abonos</h1>
      </header>

      {pageError && (
        <div
          role="alert"
          className="shrink-0 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {pageError}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-4 md:grid-cols-[minmax(260px,1fr)_2fr] md:grid-rows-1">
        <section className="flex min-h-0 flex-col rounded-[20px] bg-surface p-4 shadow-soft">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => switchTab('pending')}
              className={`${tabBase} ${
                tab === 'pending'
                  ? 'bg-accent-strong text-white'
                  : 'bg-canvas text-muted hover:text-ink'
              }`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => switchTab('paid')}
              className={`${tabBase} ${
                tab === 'paid'
                  ? 'bg-accent-strong text-white'
                  : 'bg-canvas text-muted hover:text-ink'
              }`}
            >
              Saldadas
            </button>
          </div>

          <div className="relative mt-3">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl bg-canvas pl-10 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="-mx-2 mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pt-1 pb-4">
            {visibleList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                {tab === 'pending' ? 'No hay cuentas pendientes' : 'No hay cuentas saldadas'}
              </p>
            ) : (
              visibleList.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPatient(p)}
                  className={`cursor-pointer rounded-xl px-4 py-3 text-left transition-colors ${
                    selected?.id === p.id
                      ? 'bg-accent-soft ring-1 ring-accent'
                      : 'bg-canvas hover:bg-accent-soft'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">
                    {p.name} {p.lastName}
                  </p>
                  {p.remaining > 0 ? (
                    <p className="mt-0.5 text-xs font-bold tabular-nums text-accent-strong">
                      {money(p.remaining)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs font-bold text-success">Saldado</p>
                  )}
                </button>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-[20px] bg-surface p-6 shadow-soft">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              <p className="text-lg font-bold text-ink">Selecciona un paciente</p>
              <p className="text-sm text-muted">
                Haz clic en un paciente para ver sus abonos
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight text-ink">
                  {selected.name} {selected.lastName}
                </h2>
              </div>

              <div className="mt-4 shrink-0 rounded-[16px] bg-canvas px-6 py-5">
                {isSelectedPaid ? (
                  <p className="text-2xl font-bold text-success">Cuenta saldada</p>
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-accent-strong">
                    Saldo pendiente: {money(selected.remaining)}
                  </p>
                )}
              </div>

              <div className="-mx-2 mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-4">
                {ascending.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">
                    Sin abonos registrados
                  </p>
                ) : (
                  ascending.map((a, i) => {
                    const prev =
                      i === 0 ? a.treatmentCost : ascending[i - 1].remaining
                    const prefix = i === 0 ? 'Costo inicial' : 'Saldo'
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3"
                      >
                        <span className="text-xs font-semibold tabular-nums text-muted">
                          {a.date ?? '—'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {a.description || '—'}
                        </span>
                        <span className="hidden text-xs font-bold tabular-nums text-accent-strong sm:block">
                          {prefix}: {money(prev)} - Abono: {money(a.amount)} = Saldo:{' '}
                          {money(a.remaining)}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(a)}
                            className="h-8 cursor-pointer rounded-lg bg-accent-strong px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-strong/85"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(a)}
                            aria-label="Eliminar abono"
                            className="h-8 w-8 cursor-pointer rounded-lg bg-danger-soft text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white"
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {!isSelectedPaid && (
                <div className="mt-4 shrink-0 rounded-[16px] bg-canvas p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="h-9 w-[150px] rounded-lg bg-surface px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Monto ($)"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="h-9 min-w-[110px] flex-1 rounded-lg bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="h-9 min-w-[140px] flex-1 rounded-lg bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={busy}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent-strong px-4 text-sm font-semibold text-white transition-all hover:bg-accent-strong/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={15} weight="bold" />
                      Agregar
                    </button>
                  </div>
                  {addError && (
                    <p role="alert" className="mt-2 text-xs text-danger">
                      {addError}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {editing && (
        <AbonoDialog
          initialDate={editing.date ?? today}
          initialAmount={editing.amount}
          initialDescription={editing.description ?? ''}
          error={dialogError}
          busy={busy}
          onCancel={() => {
            if (!busy) {
              setEditing(null)
              setDialogError(null)
            }
          }}
          onSave={handleEditSave}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar abono"
          message={`¿Eliminar el abono de ${money(deleting.amount)} del ${deleting.date ?? '—'}?\nLos saldos posteriores se recalcularán.`}
          confirmLabel="Eliminar"
          error={dialogError}
          busy={busy}
          onCancel={() => {
            if (!busy) setDeleting(null)
          }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
