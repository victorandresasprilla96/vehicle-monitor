import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '../../theme/theme'
import { ThemeToggle } from './ThemeToggle'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  it('is a switch with a stable accessible name', () => {
    renderToggle()
    const toggle = screen.getByRole('switch', { name: 'Modo oscuro' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles the theme on click and persists the choice', async () => {
    renderToggle()
    const toggle = screen.getByRole('switch', { name: 'Modo oscuro' })

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('is operable with the keyboard (Tab + Space / Enter)', async () => {
    renderToggle()
    const user = userEvent.setup()
    const toggle = screen.getByRole('switch', { name: 'Modo oscuro' })

    await user.tab()
    expect(toggle).toHaveFocus()

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('restores a stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderToggle()
    expect(screen.getByRole('switch', { name: 'Modo oscuro' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
