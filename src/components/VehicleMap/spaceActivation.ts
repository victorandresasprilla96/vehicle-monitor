/**
 * Leaflet renders its controls (zoom +/−) as <a role="button">. Links activate
 * on Enter only, but WCAG expects a button to respond to Space too. This adds
 * native-button semantics to every such element inside `root`:
 * Space doesn't scroll the page, and activates on key *release* (like <button>).
 * Returns a cleanup function.
 */
export function enableSpaceActivation(root: HTMLElement): () => void {
  const isRoleButtonLink = (el: EventTarget | null): el is HTMLAnchorElement =>
    el instanceof HTMLAnchorElement && el.getAttribute('role') === 'button'

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' && isRoleButtonLink(event.target)) event.preventDefault()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== ' ' || !isRoleButtonLink(event.target)) return
    event.preventDefault()
    event.target.click()
  }

  root.addEventListener('keydown', onKeyDown)
  root.addEventListener('keyup', onKeyUp)
  return () => {
    root.removeEventListener('keydown', onKeyDown)
    root.removeEventListener('keyup', onKeyUp)
  }
}
