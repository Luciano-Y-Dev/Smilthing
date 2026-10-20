import type { EstadisticasAdmin } from '../../api/admin'
import { glassCard, money } from '../theme'

function Chip({
  label,
  value,
  tint,
  delay,
  money: isMoney,
}: {
  label: string
  value: string | number
  tint?: string
  delay: number
  money?: boolean
}) {
  return (
    <div
      className={`admin-rise ${glassCard} overflow-hidden p-4`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p
        className={`mt-1.5 font-sans text-3xl font-semibold leading-none tabular-nums ${tint ?? 'text-ink'} ${isMoney ? 'tracking-tight' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

export default function StatsBento({
  stats,
  trials,
}: {
  stats: EstadisticasAdmin
  trials: { id: number; nombre: string; trial_expires: string | null }[]
}) {
  return (
    <section className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <Chip label="Clínicas" value={stats.clinicas_total} delay={0} />
      <Chip
        label="Ingresos del mes"
        value={money(stats.ingresos_mes)}
        delay={40}
        money
      />
      <Chip label="Activas" value={stats.activas} tint="text-success" delay={80} />
      <Chip label="Trials 7 días" value={trials.length} delay={120} />
      <Chip
        label="Suspendidas"
        value={stats.suspendidas}
        tint="text-danger"
        delay={160}
      />
      <Chip label="Pacientes" value={stats.pacientes_total} delay={200} />
    </section>
  )
}
