import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Tooth as ToothIcon } from '@phosphor-icons/react'
import type { OdontogramAffection } from '../api/client'

type ToolKey = 'caries' | 'resina' | 'ausente' | 'endodoncia' | 'corona'
type FaceCode = 'V' | 'O' | 'L' | 'M' | 'D'
type FaceState = { tool: ToolKey; description: string }
type FacesMap = Record<number, Partial<Record<FaceCode, FaceState>>>

const TOOLS: Record<ToolKey, { color: string; bg: string; label: string }> = {
  caries: { color: '#9E4A5B', bg: '#F9E4E8', label: 'Caries' },
  resina: { color: '#567080', bg: '#E3EDF2', label: 'Resina' },
  ausente: { color: '#7F7280', bg: '#EDE9EC', label: 'Ausente' },
  endodoncia: { color: '#756391', bg: '#EBE5F3', label: 'Endodoncia' },
  corona: { color: '#8F6E3E', bg: '#F3EBE0', label: 'Corona' },
}

const TOOL_KEYS = Object.keys(TOOLS) as ToolKey[]
const FACE_CODES: FaceCode[] = ['D', 'L', 'M', 'O', 'V']
const DISPLAY_FACES: FaceCode[] = ['V', 'O', 'L', 'M', 'D']

const FACE_LABELS: Record<FaceCode, string> = {
  V: 'Vestibular',
  O: 'Oclusal',
  L: 'Lingual',
  M: 'Mesial',
  D: 'Distal',
}

const FACE_ALIASES: Record<string, FaceCode> = {
  V: 'V',
  Vestibular: 'V',
  O: 'O',
  Oclusal: 'O',
  L: 'L',
  Lingual: 'L',
  M: 'M',
  Mesial: 'M',
  D: 'D',
  Distal: 'D',
}

const TOOL_TO_AFFECTED: Record<ToolKey, string> = {
  caries: 'Yes',
  resina: 'Resina',
  ausente: 'Ausente',
  endodoncia: 'Endodoncia',
  corona: 'Corona',
}

function affectedToTool(affected: string): ToolKey {
  const v = affected.toLowerCase()
  if (v === 'resina') return 'resina'
  if (v === 'ausente') return 'ausente'
  if (v === 'endodoncia') return 'endodoncia'
  if (v === 'corona') return 'corona'
  return 'caries'
}

const PERMANENT = {
  upperLeft: [18, 17, 16, 15, 14, 13, 12, 11],
  upperRight: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerRight: [31, 32, 33, 34, 35, 36, 37, 38],
}

const TEMPORARY = {
  upperLeft: [55, 54, 53, 52, 51],
  upperRight: [61, 62, 63, 64, 65],
  lowerLeft: [85, 84, 83, 82, 81],
  lowerRight: [71, 72, 73, 74, 75],
}

function toMap(affections: OdontogramAffection[]): FacesMap {
  const map: FacesMap = {}
  for (const a of affections) {
    if (!a.affected || a.affected === 'No') continue
    const face = FACE_ALIASES[a.face]
    if (!face) continue
    if (!map[a.tooth]) map[a.tooth] = {}
    map[a.tooth][face] = {
      tool: affectedToTool(a.affected),
      description: a.description ?? '',
    }
  }
  return map
}

function toAffections(map: FacesMap): OdontogramAffection[] {
  const out: OdontogramAffection[] = []
  for (const tooth of Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)) {
    for (const face of FACE_CODES) {
      const state = map[tooth][face]
      if (!state) continue
      out.push({
        tooth,
        face,
        affected: TOOL_TO_AFFECTED[state.tool],
        description: state.description || null,
      })
    }
  }
  return out
}

function cloneMap(map: FacesMap): FacesMap {
  const next: FacesMap = {}
  for (const [tooth, faces] of Object.entries(map)) {
    next[Number(tooth)] = { ...faces }
  }
  return next
}

interface OdontogramProps {
  affections: OdontogramAffection[]
  onChange?: (affections: OdontogramAffection[]) => void
  readOnly?: boolean
}

export default function Odontogram({
  affections,
  onChange,
  readOnly = false,
}: OdontogramProps) {
  const [dentition, setDentition] = useState<'adult' | 'child'>(() =>
    affections.some(a => a.tooth >= 50) ? 'child' : 'adult',
  )
  const [tool, setTool] = useState<ToolKey>('caries')
  const [selected, setSelected] = useState<{ tooth: number; face: FaceCode } | null>(
    null,
  )

  const map = toMap(affections)
  const teeth = dentition === 'adult' ? PERMANENT : TEMPORARY

  const mutate = (fn: (m: FacesMap) => void) => {
    const next = cloneMap(map)
    fn(next)
    onChange?.(toAffections(next))
  }

  const handleFaceClick = (tooth: number, face: FaceCode) => {
    if (readOnly) return
    let removed = false
    mutate(m => {
      if (!m[tooth]) m[tooth] = {}
      const current = m[tooth][face]
      if (current?.tool === tool) {
        delete m[tooth][face]
        if (Object.keys(m[tooth]).length === 0) {
          delete m[tooth]
          removed = true
        }
      } else {
        m[tooth][face] = { tool, description: current?.description ?? '' }
      }
    })
    if (removed) setSelected(null)
    else setSelected({ tooth, face })
  }

  const handleFaceButton = (tooth: number, face: FaceCode) => {
    const state = map[tooth]?.[face]
    if (!state) {
      mutate(m => {
        if (!m[tooth]) m[tooth] = {}
        m[tooth][face] = { tool, description: '' }
      })
    }
    setSelected({ tooth, face })
  }

  const applyDescription = (tooth: number, face: FaceCode, desc: string) => {
    mutate(m => {
      if (!m[tooth]) m[tooth] = {}
      const current = m[tooth][face]
      m[tooth][face] = { tool: current?.tool ?? tool, description: desc }
    })
  }

  const clearTooth = () => {
    if (!selected) return
    mutate(m => {
      delete m[selected.tooth]
    })
    setSelected(null)
  }

  const removeFace = (tooth: number, face: FaceCode) => {
    let emptied = false
    mutate(m => {
      if (!m[tooth]) return
      delete m[tooth][face]
      if (Object.keys(m[tooth]).length === 0) {
        delete m[tooth]
        emptied = true
      }
    })
    if (emptied && selected?.tooth === tooth) setSelected(null)
  }

  const handleToothSelect = (tooth: number) => {
    if (readOnly) return
    setSelected(prev => (prev?.tooth === tooth ? prev : { tooth, face: 'O' }))
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-face-panel] button')
        ?.focus()
    })
  }

  const entries: {
    tooth: number
    face: FaceCode
    state: FaceState
  }[] = []
  for (const tooth of Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)) {
    for (const face of FACE_CODES) {
      const state = map[tooth][face]
      if (state) entries.push({ tooth, face, state })
    }
  }

  const selectedState =
    selected && map[selected.tooth]?.[selected.face]
      ? map[selected.tooth][selected.face]!
      : null

  const dentitionBtn = (dtype: 'adult' | 'child') => (
    <button
      key={dtype}
      type="button"
      onClick={() => {
        setDentition(dtype)
        setSelected(null)
      }}
      className={`h-8 cursor-pointer rounded-[10px] px-4 text-sm font-semibold transition-colors ${
        dentition === dtype ? 'bg-accent-strong text-white' : 'text-muted hover:text-ink'
      }`}
    >
      {dtype === 'adult' ? 'Adulto' : 'Niño'}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Dentición:</span>
          <div className="flex rounded-xl bg-canvas p-1">
            {dentitionBtn('adult')}
            {dentitionBtn('child')}
          </div>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {TOOL_KEYS.map(key => {
              const { color, bg, label } = TOOLS[key]
              const active = tool === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTool(key)}
                  style={{
                    backgroundColor: active ? color : bg,
                    color: active ? '#ffffff' : '#2b2226',
                  }}
                  className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-opacity hover:opacity-90 ${active ? 'shadow-soft' : ''}`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? '#ffffff' : color }}
                  />
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 2xl:flex-row">
        <div className="relative flex w-full min-w-0 flex-col 2xl:flex-1">
          <div className="flex min-w-0 flex-col justify-center overflow-x-auto overscroll-x-contain rounded-xl bg-canvas p-4 flex-1">
            <div className="relative mx-auto w-max">
              <p className="pb-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                Superior
              </p>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-divider"
                />
                <ArchRow
                  left={teeth.upperLeft}
                  right={teeth.upperRight}
                  arch="upper"
                  map={map}
                  selected={selected}
                  readOnly={readOnly}
                  onFaceClick={handleFaceClick}
                  onToothSelect={handleToothSelect}
                />
                <NumberBand
                  upperLeft={teeth.upperLeft}
                  lowerLeft={teeth.lowerLeft}
                  upperRight={teeth.upperRight}
                  lowerRight={teeth.lowerRight}
                  selected={selected}
                />
                <ArchRow
                  left={teeth.lowerLeft}
                  right={teeth.lowerRight}
                  arch="lower"
                  map={map}
                  selected={selected}
                  readOnly={readOnly}
                  onFaceClick={handleFaceClick}
                  onToothSelect={handleToothSelect}
                />
              </div>
              <p className="pt-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                Inferior
              </p>
            </div>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-xl bg-gradient-to-r from-canvas via-canvas/70 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-canvas via-canvas/70 to-transparent"
          />
        </div>

        {!readOnly && (
          <div className="shrink-0 rounded-xl bg-canvas p-4 2xl:w-60">
            <p className="text-sm font-bold text-ink">Diente seleccionado</p>
            {!selected ? (
              <div className="flex flex-col items-center gap-2 px-2 pt-8 pb-4 text-center md:pt-5">
                <ToothIcon size={36} className="text-muted/40" />
                <p className="text-xs leading-relaxed text-muted">
                  Toca una cara del diente
                  <br />
                  para marcarla.
                </p>
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2.5 max-2xl:flex-row max-2xl:items-start max-2xl:gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-bold tabular-nums text-accent-strong">
                      Diente {selected.tooth}
                    </p>
                    {selectedState && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: TOOLS[selectedState.tool].bg,
                          color: TOOLS[selectedState.tool].color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: TOOLS[selectedState.tool].color,
                          }}
                        />
                        {TOOLS[selectedState.tool].label}
                      </span>
                    )}
                  </div>
                  <div data-face-panel className="grid w-full grid-cols-5 gap-1.5 max-2xl:w-52">
                    {DISPLAY_FACES.map(face => {
                      const state = map[selected.tooth]?.[face]
                      const isSelected = selected.face === face
                      const faceTool = state ? TOOLS[state.tool] : null
                      return (
                        <button
                          key={face}
                          type="button"
                          title={FACE_LABELS[face]}
                          aria-pressed={isSelected}
                          onClick={() => handleFaceButton(selected.tooth, face)}
                          style={
                            faceTool
                              ? { backgroundColor: faceTool.bg, color: faceTool.color }
                              : undefined
                          }
                          className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-canvas'
                              : 'border-transparent'
                          } ${
                            faceTool
                              ? ''
                              : 'bg-surface text-muted shadow-soft hover:text-ink'
                          }`}
                        >
                          {face}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 max-2xl:max-w-xs">
                  {selectedState ? (
                    <DescEditor
                      key={`${selected.tooth}-${selected.face}`}
                      initial={selectedState.description}
                      onApply={desc =>
                        applyDescription(selected.tooth, selected.face, desc)
                      }
                    />
                  ) : (
                    <p className="text-xs leading-relaxed text-muted">
                      Sin marca en esta cara. Se aplicará la herramienta activa.
                    </p>
                  )}
                  {(selectedState || map[selected.tooth]) && (
                    <div className="flex gap-2">
                      {selectedState && (
                        <button
                          type="button"
                          onClick={() => removeFace(selected.tooth, selected.face)}
                          className="h-8 flex-1 cursor-pointer rounded-lg bg-danger-soft text-xs font-semibold text-danger transition-colors hover:bg-danger-solid hover:text-white"
                        >
                          Quitar marca
                        </button>
                      )}
                      {map[selected.tooth] && (
                        <button
                          type="button"
                          onClick={clearTooth}
                          className="h-8 flex-1 cursor-pointer rounded-lg bg-surface text-xs text-muted shadow-soft transition-colors hover:text-ink"
                        >
                          Limpiar diente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-canvas px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-ink">Afecciones registradas</p>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-strong">
            {entries.length}
          </span>
        </div>
        {entries.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted">
            Sin afecciones registradas
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {entries.map(({ tooth, face, state }) => (
              <li
                key={`${tooth}-${face}`}
                className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1.5 text-xs shadow-soft"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: TOOLS[state.tool].color }}
                />
                <span className="font-bold tabular-nums text-ink">{tooth}</span>
                <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  {face}
                </span>
                <span className="font-semibold text-ink">
                  {TOOLS[state.tool].label}
                </span>
                {state.description && (
                  <span className="max-w-40 truncate text-muted">
                    "{state.description}"
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeFace(tooth, face)}
                    aria-label={`Quitar marca del diente ${tooth} cara ${face}`}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded-full bg-canvas text-xs font-bold text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DescEditor({
  initial,
  onApply,
}: {
  initial: string
  onApply: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim()
        if (next !== initial) onApply(next)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      placeholder="Descripción..."
      className="h-9 w-full rounded-lg bg-surface px-3 text-xs text-ink shadow-soft outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
    />
  )
}

function ArchRow({
  left,
  right,
  arch,
  map,
  selected,
  readOnly,
  onFaceClick,
  onToothSelect,
}: {
  left: number[]
  right: number[]
  arch: 'upper' | 'lower'
  map: FacesMap
  selected: { tooth: number; face: FaceCode } | null
  readOnly: boolean
  onFaceClick: (tooth: number, face: FaceCode) => void
  onToothSelect: (tooth: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex gap-[2px]">
        {left.map(n => (
          <ToothCell
            key={n}
            tooth={n}
            arch={arch}
            side="left"
            states={map[n]}
            active={selected?.tooth === n}
            selectedFace={selected?.tooth === n ? selected.face : null}
            readOnly={readOnly}
            onFaceClick={onFaceClick}
            onToothSelect={onToothSelect}
          />
        ))}
      </div>
      <div className="flex gap-[2px]">
        {right.map(n => (
          <ToothCell
            key={n}
            tooth={n}
            arch={arch}
            side="right"
            states={map[n]}
            active={selected?.tooth === n}
            selectedFace={selected?.tooth === n ? selected.face : null}
            readOnly={readOnly}
            onFaceClick={onFaceClick}
            onToothSelect={onToothSelect}
          />
        ))}
      </div>
    </div>
  )
}

function NumberBand({
  upperLeft,
  lowerLeft,
  upperRight,
  lowerRight,
  selected,
}: {
  upperLeft: number[]
  lowerLeft: number[]
  upperRight: number[]
  lowerRight: number[]
  selected: { tooth: number; face: FaceCode } | null
}) {
  const cell = (upper: number, lower: number) => (
    <span
      key={upper}
      className="flex w-[46px] flex-col items-center gap-0.5 text-[11px] leading-tight font-semibold tabular-nums"
    >
      <span
        className={`rounded-md px-1.5 py-px transition-colors ${
          selected?.tooth === upper
            ? 'bg-accent-soft text-accent-strong'
            : 'text-muted'
        }`}
      >
        {upper}
      </span>
      <span
        className={`rounded-md px-1.5 py-px transition-colors ${
          selected?.tooth === lower
            ? 'bg-accent-soft text-accent-strong'
            : 'text-muted'
        }`}
      >
        {lower}
      </span>
    </span>
  )
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <div className="flex gap-[2px]">
        {upperLeft.map((n, i) => cell(n, lowerLeft[i]))}
      </div>
      <div className="flex gap-[2px]">
        {upperRight.map((n, i) => cell(n, lowerRight[i]))}
      </div>
    </div>
  )
}

function ToothCell({
  tooth,
  arch,
  side,
  states,
  active,
  selectedFace,
  readOnly,
  onFaceClick,
  onToothSelect,
}: {
  tooth: number
  arch: 'upper' | 'lower'
  side: 'left' | 'right'
  states?: Partial<Record<FaceCode, FaceState>>
  active: boolean
  selectedFace: FaceCode | null
  readOnly: boolean
  onFaceClick: (tooth: number, face: FaceCode) => void
  onToothSelect: (tooth: number) => void
}) {
  const zoneFace = (zone: 'top' | 'bottom' | 'left' | 'right'): FaceCode => {
    if (zone === 'top') return arch === 'upper' ? 'V' : 'L'
    if (zone === 'bottom') return arch === 'upper' ? 'L' : 'V'
    if (zone === 'left') return side === 'left' ? 'D' : 'M'
    return side === 'left' ? 'M' : 'D'
  }

  const fillFor = (face: FaceCode) =>
    states?.[face] ? TOOLS[states[face]!.tool].color : '#ffffff'

  const titleFor = (face: FaceCode) => {
    const state = states?.[face]
    if (!state) return undefined
    const desc = state.description ? ` — "${state.description}"` : ''
    return `Diente ${tooth} · ${FACE_LABELS[face]} · ${TOOLS[state.tool].label}${desc}`
  }

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (readOnly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 48
    const y = ((e.clientY - rect.top) / rect.height) * 52
    let zone: 'top' | 'bottom' | 'left' | 'right' | 'center'
    if (y < 16.5) zone = 'top'
    else if (y > 35.5) zone = 'bottom'
    else if (x < 14.5) zone = 'left'
    else if (x > 33.5) zone = 'right'
    else zone = 'center'
    const face = zone === 'center' ? 'O' : zoneFace(zone)
    onFaceClick(tooth, face)
  }

  const zoneClass = (face: FaceCode) => {
    if (readOnly) return ''
    const base = 'cursor-pointer transition-[fill,opacity] duration-150'
    return states?.[face] ? `${base} hover:opacity-75` : `${base} hover:fill-[#f9edf0]`
  }

  const faces: {
    zone: 'top' | 'bottom' | 'left' | 'right'
    x: number
    y: number
    w: number
    h: number
  }[] = [
    { zone: 'top', x: 5, y: 5, w: 38, h: 11 },
    { zone: 'bottom', x: 5, y: 36, w: 38, h: 11 },
    { zone: 'left', x: 5, y: 17, w: 9, h: 18 },
    { zone: 'right', x: 34, y: 17, w: 9, h: 18 },
  ]

  const renderZones: {
    face: FaceCode
    x: number
    y: number
    w: number
    h: number
    rx: number
  }[] = [
    ...faces.map(f => ({ face: zoneFace(f.zone), x: f.x, y: f.y, w: f.w, h: f.h, rx: 3 })),
    { face: 'O' as FaceCode, x: 15, y: 17, w: 18, h: 18, rx: 4 },
  ]

  const toothClass = tooth % 10
  const isMolar = toothClass >= 6 || (tooth >= 50 && toothClass >= 4)
  const anatomy = isMolar
    ? 'M24 21.5v9M19.5 26h9'
    : toothClass >= 4
      ? 'M24 22.5v7M20.5 26h7'
      : toothClass >= 3
        ? 'M20 26h8'
        : 'M18.5 26h11'

  const markedFaces = DISPLAY_FACES.filter(f => states?.[f])
  const ariaParts = markedFaces.map(
    f => `${FACE_LABELS[f]}: ${TOOLS[states![f]!.tool].label}`,
  )
  const toothAria = readOnly
    ? `Diente ${tooth}${ariaParts.length ? `, ${ariaParts.join('; ')}` : ', sin marcas'}`
    : `Diente ${tooth}, seleccionar${ariaParts.length ? `; marcado: ${ariaParts.join('; ')}` : ''}`

  return (
    <div
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      aria-label={toothAria}
      onKeyDown={
        readOnly
          ? undefined
          : e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToothSelect(tooth)
              }
            }
      }
      className={`shrink-0 rounded-[11px] bg-surface transition-all duration-150 ${
        active
          ? 'z-10 scale-110 shadow-[0_4px_12px_rgba(201,127,141,0.3)] ring-[1.5px] ring-accent'
          : `ring-divider shadow-[0_1px_2px_rgba(43,34,38,0.05)] ring-[0.5px] hover:ring-accent-soft hover:shadow-[0_3px_8px_rgba(43,34,38,0.09)]${
              readOnly ? '' : ' cursor-pointer'
            }`
      }${readOnly ? '' : ' focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'}`}
    >
      <svg
        viewBox="0 0 48 52"
        width={46}
        height={50}
        onClick={handleClick}
        className="block select-none"
        aria-hidden
      >
        {renderZones.map(({ face, x, y, w, h, rx }) => {
          const title = titleFor(face)
          return (
            <g key={face}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={rx}
                fill={fillFor(face)}
                className={zoneClass(face)}
              />
              {title && <title>{title}</title>}
            </g>
          )
        })}
        {!states?.O && (
          <path
            d={anatomy}
            fill="none"
            stroke="#efe8e6"
            strokeLinecap="round"
            strokeWidth={1}
            pointerEvents="none"
          />
        )}
        {renderZones
          .filter(z => selectedFace === z.face && states?.[z.face])
          .map(z => (
            <rect
              key={`sel-${z.face}`}
              x={z.x + 0.5}
              y={z.y + 0.5}
              width={z.w - 1}
              height={z.h - 1}
              rx={Math.max(z.rx - 0.5, 1)}
              fill="none"
              pointerEvents="none"
              stroke="#8f4453"
              strokeWidth={1}
            />
          ))}
      </svg>
    </div>
  )
}
