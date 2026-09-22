import { useEffect, useState } from 'react'
import styles from './ConnectionBanner.module.css'

export type ConnectionState = 'ok' | 'offline' | 'unstable'

const RECOVERED_VISIBLE_MS = 3500

const COPY: Record<
  Exclude<ConnectionState, 'ok'> | 'recovered',
  { title: string; detail: string }
> = {
  offline: {
    title: 'Sin conexión a internet',
    detail: 'Los datos se actualizarán en cuanto vuelva la conexión.',
  },
  unstable: {
    title: 'Conexión inestable',
    detail: 'Mostrando los últimos datos conocidos. Reintentando…',
  },
  recovered: {
    title: 'Conexión restablecida',
    detail: 'Los datos vuelven a estar en tiempo real.',
  },
}

/**
 * Floating status toast for connection problems *while data is on screen*.
 * It overlays the map instead of pushing content (no layout shift), and uses
 * role="status" (polite) — an unstable link is important, not an emergency.
 * A short "recovered" confirmation closes the loop for the operator.
 */
export function ConnectionBanner({ state }: { state: ConnectionState }) {
  const [recovered, setRecovered] = useState(false)
  const [previous, setPrevious] = useState(state)

  // Derive the transition during render ("degraded → ok" = recovered),
  // instead of reacting to it in an effect.
  if (state !== previous) {
    setPrevious(state)
    setRecovered(previous !== 'ok' && state === 'ok')
  }

  // The effect only owns the timer that hides the confirmation.
  useEffect(() => {
    if (!recovered) return
    const timer = window.setTimeout(() => setRecovered(false), RECOVERED_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [recovered])

  const variant = state !== 'ok' ? state : recovered ? 'recovered' : null
  const copy = variant ? COPY[variant] : null

  return (
    // The live region is always mounted so the first message is reliably announced.
    <div className={styles.region} role="status">
      {copy && (
        <div className={styles.banner} data-variant={variant}>
          <span className={styles.indicator} aria-hidden="true" />
          <p className={styles.text}>
            <strong>{copy.title}.</strong> {copy.detail}
          </p>
        </div>
      )}
    </div>
  )
}
