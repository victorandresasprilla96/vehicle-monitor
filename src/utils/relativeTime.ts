const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'always', style: 'long' })

/** Data older than this is flagged: a control room must not mistake it for live. */
export const OLD_DATA_SECONDS = 120

/**
 * Human "how long ago": "Hace unos segundos", "Hace 25 segundos", "Hace 3 minutos"…
 * Under 10 s it stays vague on purpose: a ticking "hace 3 s, 4 s, 5 s" is noise.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  let text: string
  if (seconds < 10) text = 'hace unos segundos'
  else if (seconds < 60) text = rtf.format(-seconds, 'second')
  else if (seconds < 3600) text = rtf.format(-Math.floor(seconds / 60), 'minute')
  else if (seconds < 86_400) text = rtf.format(-Math.floor(seconds / 3600), 'hour')
  else text = rtf.format(-Math.floor(seconds / 86_400), 'day')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function ageSeconds(iso: string, now: number = Date.now()): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 1000)
}
