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

describe('AppShell', () => {
  it('shows a restore disclosure when the panel is collapsed beside the map', async () => {
    mockLayout(true)
    const onExpand = vi.fn()
    renderWithProviders(
      <AppShell
        panel={<p>Contenido del panel</p>}
        map={<p>Mapa</p>}
        collapsed
        onExpand={onExpand}
      />,
    )
    const panel = document.getElementById('vehicle-panel')!
    expect(panel).not.toBeVisible()
    const restore = screen.getByRole('button', { name: 'Panel del vehículo' })
    expect(restore).toHaveAttribute('aria-expanded', 'false')
    expect(restore).toHaveAttribute('aria-controls', panel.id)
    // Skip link would point to a hidden panel: it's removed while collapsed
    expect(
      screen.queryByRole('link', { name: 'Saltar al estado del vehículo' }),
    ).not.toBeInTheDocument()

    await userEvent.click(restore)
    expect(onExpand).toHaveBeenCalled()
  })

  it('floats the overlay card over the map beside the panel', () => {
    mockLayout(true)
    renderWithProviders(
      <AppShell panel={<p>Lista</p>} map={<p>Mapa</p>} mapOverlay={<p>Tarjeta</p>} />,
    )
    expect(screen.getByRole('region', { name: 'Mapa' })).toHaveTextContent('Tarjeta')
  })

  it('never offers collapsing in the stacked (mobile) layout', () => {
    mockLayout(false)
    renderWithProviders(<AppShell panel={<p>Contenido del panel</p>} map={<p>Mapa</p>} collapsed />)
    // Stacked layout ignores `collapsed`: the panel stays and there is no restore button
    expect(screen.queryByRole('button', { name: 'Panel del vehículo' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Estado del vehículo' })).toBeVisible()
  })
})
