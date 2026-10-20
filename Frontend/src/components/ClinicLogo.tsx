import { useState, type CSSProperties } from 'react'
import { useAuth } from '../auth/AuthContext'
import PlatformMark from './PlatformMark'

interface ClinicLogoProps {
  className?: string
  alt?: string
  style?: CSSProperties
}

export default function ClinicLogo({ className, alt, style }: ClinicLogoProps) {
  const { me } = useAuth()
  const [failed, setFailed] = useState(false)
  const src = me?.clinica.logo_url
  const label = alt ?? me?.clinica.nombre ?? 'Clínica'

  if (!src || failed) {
    return (
      <PlatformMark
        className={className}
        title={label}
        {...(style ? { style } : {})}
      />
    )
  }

  return (
    <img
      src={src}
      alt={label}
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  )
}
