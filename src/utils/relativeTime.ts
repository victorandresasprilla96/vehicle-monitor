const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'always', style: 'short' })

/** Data older than this is flagged: a control room must not mistake it for live. */
export const OLD_DATA_SECONDS = 120

/**
 * Compact "how long ago" for a dense control-room UI: "Ahora", "Hace 25 s",
 * "Hace 3 min"… (screen readers expand the abbreviations).
 * Under 10 s it stays vague on purpose: a ticking "hace 3 s, 4 s, 5 s" is noise.
 * All forms are similarly short, so the text doesn't jump in width every tick.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  let text: string
  if (seconds < 10) text = 'ahora'
  else if (seconds < 60) text = rtf.format(-seconds, 'second')
  else if (seconds < 3600) text = rtf.format(-Math.floor(seconds / 60), 'minute')
  else if (seconds < 86_400) text = rtf.format(-Math.floor(seconds / 3600), 'hour')
  else text = rtf.format(-Math.floor(seconds / 86_400), 'day')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function ageSeconds(iso: string, now: number = Date.now()): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 1000)
}
