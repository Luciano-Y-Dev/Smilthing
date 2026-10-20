import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { Image, Trash } from '@phosphor-icons/react'
import { adminApi, type ClinicaAdminRow } from '../../api/admin'
import { ctaClass } from '../theme'
import PlatformMark from '../../components/PlatformMark'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const presets = ['#c97f8d', '#8f4453', '#4568b8', '#357a52', '#6b5b95', '#2a7f7f']

function previewVars(color: string): CSSProperties {
  return {
    '--color-accent': color,
    '--color-accent-strong': `color-mix(in oklab, ${color} 78%, #241820)`,
    '--color-accent-soft': `color-mix(in oklab, ${color} 12%, #ffffff)`,
  } as CSSProperties
}

export default function BrandingEditor({
  clinica,
  onSaved,
}: {
  clinica: ClinicaAdminRow
  onSaved: () => void
}) {
  const [color, setColor] = useState(clinica.color_primary ?? '#c97f8d')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pickFile = (next: File | null) => {
    setError(null)
    if (!next) return
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setError('Formato no soportado. Use PNG, JPG o WebP.')
      return
    }
    if (next.size > MAX_BYTES) {
      setError('El archivo supera los 2 MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFailed(false)
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files?.[0] ?? null)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (file) await adminApi.uploadLogo(clinica.id, file)
      if (color.toLowerCase() !== (clinica.color_primary ?? '').toLowerCase()) {
        await adminApi.updateClinica(clinica.id, { color_primary: color })
      }
      setFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la marca.')
    } finally {
      setBusy(false)
    }
  }

  const removeLogo = async () => {
    setBusy(true)
    setError(null)
    try {
      await adminApi.deleteLogo(clinica.id)
      setFile(null)
      setFailed(false)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar el logo.')
    } finally {
      setBusy(false)
    }
  }

  const logoSrc = previewUrl ?? (failed ? null : clinica.logo_url)
  const showFallback = logoSrc === null
  const dirty =
    file !== null ||
    color.toLowerCase() !== (clinica.color_primary ?? '').toLowerCase()

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted">Logo</p>
        <div
          onDragOver={e => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-2 flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
            dragging ? 'border-accent bg-accent-soft' : 'border-white/15 bg-black/20'
          }`}
        >
          {showFallback ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <PlatformMark className="h-8 w-8 text-muted" />
            </span>
          ) : (
            <img
              src={logoSrc}
              alt=""
              onError={() => setFailed(true)}
              className="h-16 w-16 rounded-xl border border-white/10 bg-white/5 object-contain p-1"
            />
          )}
          <p className="text-xs text-muted">PNG, JPG o WebP, máx. 2 MB</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-ink transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <Image size={14} />
              {file ? 'Cambiar archivo' : 'Elegir archivo'}
            </button>
            {(clinica.logo_url || file) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeLogo()}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash size={14} />
                Quitar logo
              </button>
            )}
          </div>
          {file && <p className="text-xs text-accent">{file.name}</p>}
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted">Color principal</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-black/25 p-1"
            aria-label="Elegir color principal"
          />
          <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs text-ink">
            {color.toUpperCase()}
          </span>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setColor(p)}
              aria-label={`Color ${p}`}
              className={`h-8 w-8 cursor-pointer rounded-full border transition-transform hover:scale-110 active:scale-95 ${
                color.toLowerCase() === p.toLowerCase()
                  ? 'border-white/70'
                  : 'border-white/15'
              }`}
              style={{ background: p }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted">Vista previa</p>
        <div
          style={previewVars(color)}
          className="mt-2 overflow-hidden rounded-xl border border-white/10"
        >
          <div className="flex gap-2 bg-[#f6f3f2] p-3">
            <div className="w-36 shrink-0 rounded-xl bg-white p-3 shadow-sm">
              {showFallback ? (
                <span className="mx-auto flex h-10 w-10 items-center justify-center">
                  <PlatformMark className="h-8 w-8 text-[#6e6166]" />
                </span>
              ) : (
                <img
                  src={logoSrc}
                  alt=""
                  onError={() => setFailed(true)}
                  className="mx-auto h-10 w-10 object-contain"
                />
              )}
              <p className="mt-1.5 truncate text-center text-[10px] font-semibold text-[#2b2226]">
                {clinica.nombre}
              </p>
              <div className="mt-2.5 rounded-lg bg-accent-soft px-2 py-1.5 text-[10px] font-semibold text-accent-strong">
                Pacientes
              </div>
              <div className="mt-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#6e6166]">
                Abonos
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-2 w-2/3 rounded-full bg-[#2b2226]/15" />
              <div className="h-2 w-1/2 rounded-full bg-[#2b2226]/10" />
              <span className="mt-1 inline-flex h-8 w-fit items-center rounded-lg bg-accent-strong px-3 text-[10px] font-semibold text-white">
                Nuevo paciente
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || !dirty}
        onClick={() => void save()}
        className={`h-11 w-full cursor-pointer rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${ctaClass}`}
      >
        {busy ? 'Guardando…' : 'Guardar marca'}
      </button>
    </div>
  )
}
