interface PlatformMarkProps {
  className?: string
  title?: string
}

export default function PlatformMark({ className, title }: PlatformMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M16 25c2 6 5 8.5 8 8.5s6-2.5 8-8.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
