import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SIDE_BY_SIDE_QUERY } from '../../hooks/useMediaQuery'
import { renderWithProviders } from '../../test/render'
import { AppShell } from './AppShell'

function mockLayout(sideBySide: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: sideBySide && query === SIDE_BY_SIDE_QUERY,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

afterEach(() => vi.restoreAllMocks())

const renderShell = () =>
  renderWithProviders(<AppShell panel={<p>Contenido del panel</p>} map={<p>Mapa</p>} />)

describe('AppShell', () => {
  it('lets the operator collapse the panel beside the map (disclosure pattern)', async () => {
    mockLayout(true)
    renderShell()
    const toggle = screen.getByRole('button', { name: 'Panel del vehículo' })
    const panel = screen.getByRole('complementary', { name: 'Estado del vehículo' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', panel.id)

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toBeVisible()
    // Skip link would point to a hidden panel: it's removed while collapsed
    expect(
      screen.queryByRole('link', { name: 'Saltar al estado del vehículo' }),
    ).not.toBeInTheDocument()

    await userEvent.click(toggle)
    expect(panel).toBeVisible()
  })

  it('never offers collapsing in the stacked (mobile) layout', () => {
    mockLayout(false)
    renderShell()
    expect(screen.queryByRole('button', { name: 'Panel del vehículo' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Estado del vehículo' })).toBeVisible()
  })
})
