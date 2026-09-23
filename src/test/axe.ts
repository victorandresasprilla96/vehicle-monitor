import axe from 'axe-core'

/**
 * Runs axe-core (WCAG 2.0/2.1/2.2 A + AA) on the current document.
 * jsdom has no layout, so colour contrast is checked separately
 * (src/styles/contrast.test.ts) and in the browser audit.
 */
export async function axeViolations(root: Element = document.body) {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
}
