import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import type { PatientWithBalance } from '../types'

interface PatientCardProps {
  patient: PatientWithBalance
  onClick: () => void
  onEdit: () => void
  onAddTreatment: () => void
  onDelete: () => void
}

export default function PatientCard({
  patient,
  onClick,
  onEdit,
  onAddTreatment,
  onDelete,
}: PatientCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="flex cursor-pointer items-center gap-4 rounded-[20px] bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[17px] font-bold text-ink">
          {patient.name} {patient.lastName}
        </p>
        <p className="text-sm tabular-nums text-muted">
          {patient.age} años · {patient.entryDate}
        </p>
        {patient.consultReason && (
          <p className="text-sm text-muted">{patient.consultReason}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          title="Editar"
          onClick={e => {
            e.stopPropagation()
            onEdit()
          }}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-info-soft text-info transition-colors hover:bg-info hover:text-white"
        >
          <PencilSimple size={16} weight="bold" />
        </button>
        <button
          type="button"
          title="Añadir tratamiento"
          onClick={e => {
            e.stopPropagation()
            onAddTreatment()
          }}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-success-soft text-success transition-colors hover:bg-success hover:text-white"
        >
          <Plus size={16} weight="bold" />
        </button>
        <button
          type="button"
          title="Eliminar"
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-danger-soft text-danger transition-colors hover:bg-danger-solid hover:text-white"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>
    </div>
  )
}
