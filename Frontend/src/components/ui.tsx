import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from 'react'
import type { Icon } from '@phosphor-icons/react'

export function Section({
  id,
  title,
  icon: IconComponent,
  children,
}: {
  id?: string
  title: string
  icon?: Icon
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-2 rounded-[20px] bg-surface p-6 shadow-soft"
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold text-ink">
        {IconComponent && <IconComponent size={19} className="text-accent" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="text-sm font-semibold text-ink">{value || '—'}</p>
    </div>
  )
}

const controlBase =
  'w-full rounded-xl bg-canvas px-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

export function FormInput({
  label,
  inputRef,
  ...props
}: { label?: string; inputRef?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  const ariaLabel =
    props['aria-label'] ?? (label ? undefined : props.placeholder) ?? undefined
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <input
        {...props}
        ref={inputRef}
        aria-label={ariaLabel}
        className={`${controlBase} h-11 ${props.className ?? ''}`}
      />
    </label>
  )
}

export function FormTextarea({
  label,
  ...props
}: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ariaLabel =
    props['aria-label'] ?? (label ? undefined : props.placeholder) ?? undefined
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <textarea
        {...props}
        aria-label={ariaLabel}
        className={`${controlBase} min-h-[80px] resize-y py-2.5 leading-relaxed ${props.className ?? ''}`}
      />
    </label>
  )
}
