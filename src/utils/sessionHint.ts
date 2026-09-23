const KEY = 'vm-has-session'

/**
 * Whether this browser has logged in before (and not out). Without it, checking
 * the session is a guaranteed 404 from Traccar — which browsers log as a console
 * error — so first-time visitors go straight to the login form.
 * It's only a hint: with it set, an expired cookie still gets the usual 404 → login.
 */
export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true // storage blocked: fall back to always asking the server
  }
}

export function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: the app just keeps asking the server
  }
}
