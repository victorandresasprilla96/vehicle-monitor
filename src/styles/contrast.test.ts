// @vitest-environment node
import { readFileSync } from 'node:fs'

// Read from disk: Vitest stubs CSS imports (even ?raw) as empty strings.
const themesCss = readFileSync(new URL('./themes.css', import.meta.url), 'utf8')

/**
 * WCAG 2.1 AA contrast guard for the theme tokens.
 * Parses themes.css so the test can never drift from the real palette.
 */

type Palette = Record<string, string>

function parseThemes(css: string): { light: Palette; dark: Palette } {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks = [...withoutComments.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  const readVars = (body: string): Palette =>
    Object.fromEntries(
      [...body.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [
        name,
        hex.toLowerCase(),
      ]),
    )

  const light = blocks.find(([, selector]) => selector.includes(':root'))
  const dark = blocks.find(([, selector]) => selector.trim() === "[data-theme='dark']")
  if (!light || !dark) throw new Error('themes.css: light or dark block not found')
  return { light: readVars(light[2]), dark: readVars(dark[2]) }
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT = 4.5 // WCAG 1.4.3 — normal text
const UI = 3 // WCAG 1.4.11 — UI components, focus indicators, graphical objects

const surfaces = ['color-bg', 'color-surface', 'color-surface-raised', 'color-surface-sunken']

// [foreground, background, minimum ratio]
const pairs: [string, string, number][] = [
  ...surfaces.flatMap((bg): [string, string, number][] => [
    ['color-text', bg, TEXT],
    ['color-text-muted', bg, TEXT],
    ['color-text-subtle', bg, TEXT],
    ['color-focus', bg, UI],
    ['color-border-strong', bg, UI],
  ]),
  ...['color-surface', 'color-surface-raised'].flatMap((bg): [string, string, number][] => [
    ['color-accent', bg, TEXT],
    ['color-online', bg, TEXT],
    ['color-offline', bg, TEXT],
    ['color-unknown', bg, TEXT],
    ['color-danger', bg, TEXT],
    ['color-warning', bg, TEXT],
  ]),
  ['color-on-accent', 'color-accent', TEXT],
  ['color-on-accent', 'color-accent-hover', TEXT],
  ['color-accent', 'color-accent-soft', TEXT],
  ['color-text', 'color-accent-soft', TEXT],
  ['color-online', 'color-online-soft', TEXT],
  ['color-offline', 'color-offline-soft', TEXT],
  ['color-unknown', 'color-unknown-soft', TEXT],
  ['color-danger', 'color-danger-soft', TEXT],
  ['color-warning', 'color-warning-soft', TEXT],
  ['color-text', 'color-highlight', TEXT],
  ['color-text-muted', 'color-highlight', TEXT],
]

const themes = parseThemes(themesCss)

describe.each(Object.entries(themes))('%s theme', (_name, palette) => {
  it('defines the same tokens as the other theme', () => {
    expect(Object.keys(palette).sort()).toEqual(Object.keys(themes.light).sort())
  })

  it.each(pairs)('%s on %s ≥ %d:1', (fg, bg, min) => {
    expect(palette[fg], `missing --${fg}`).toBeDefined()
    expect(palette[bg], `missing --${bg}`).toBeDefined()
    const ratio = contrastRatio(palette[fg], palette[bg])
    expect(
      ratio,
      `${palette[fg]} on ${palette[bg]} = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(min)
  })
})
