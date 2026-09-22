import { onlineManager } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryKeys } from '../../api/queryClient'
import type { Device, Position, User } from '../../api/types'
import { renderWithProviders } from '../../test/render'
import { Dashboard } from './Dashboard'

const user: User = {
  id: 1,
  name: 'Operador',
  email: 'op@example.com',
  administrator: false,
  readonly: false,
}
const device: Device = {
  id: 7,
  name: 'Camión 01',
  uniqueId: 'abc',
  status: 'online',
  disabled: false,
  lastUpdate: '2026-09-22T12:00:00Z',
  positionId: 99,
  category: null,
  model: null,
}
const position: Position = {
  id: 99,
  deviceId: 7,
  fixTime: '2026-09-22T12:00:00Z',
  deviceTime: '2026-09-22T12:00:00Z',
  serverTime: '2026-09-22T12:00:00Z',
  valid: true,
  latitude: 40.4168,
  longitude: -3.7038,
  altitude: 0,
  speed: 27,
  course: 45,
  accuracy: 0,
  address: null,
  attributes: { batteryLevel: 87 },
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

/** Routes are mutable so a test can make the server fail mid-way. */
function fakeTraccar(routes: Record<string, () => Response | Promise<Response>>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`
    const route = routes[key]
    if (!route) throw new Error(`Unmocked request: ${key}`)
    return route()
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, routes }
}

const networkDown = () => Promise.reject(new TypeError('Failed to fetch'))

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Dashboard', () => {
  it('keeps the last known data and flags it when a poll fails', async () => {
    const { routes } = fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    const { queryClient } = renderWithProviders(<Dashboard user={user} />)
    expect(await screen.findByText('87 %')).toBeInTheDocument()

    // Next poll fails (server went down)
    routes['GET /api/positions'] = networkDown
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.position(7) }))

    const banner = await screen.findByText(/Conexión inestable/)
    expect(banner.closest('[role=status]')).not.toBeNull()
    // Card is not blanked: last values are still on screen
    expect(screen.getByText('87 %')).toBeInTheDocument()
    expect(screen.getByText('Velocidad').nextElementSibling).toHaveTextContent('50 km/h')

    // Server recovers → warning disappears
    routes['GET /api/positions'] = () => json([{ ...position, attributes: { batteryLevel: 86 } }])
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.position(7) }))

    expect(await screen.findByText('86 %')).toBeInTheDocument()
    expect(screen.queryByText(/Conexión inestable/)).not.toBeInTheDocument()
  })

  it('shows a retryable error when the vehicle list cannot load, and recovers', async () => {
    const { routes } = fakeTraccar({
      'GET /api/devices': networkDown,
      'GET /api/positions': () => json([position]),
    })
    renderWithProviders(<Dashboard user={user} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No logramos conectar con el servidor de seguimiento')

    routes['GET /api/devices'] = () => json([device])
    // Retry sits outside the alert region (so a countdown isn't re-announced)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('combobox', { name: 'Vehículo' })).toHaveValue('7')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains an account without vehicles', async () => {
    fakeTraccar({ 'GET /api/devices': () => json([]) })
    renderWithProviders(<Dashboard user={user} />)

    expect(await screen.findByRole('heading', { name: 'Aún no hay vehículos' })).toBeInTheDocument()
  })

  it('falls back to the device last message when it never sent a position', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([]),
    })
    renderWithProviders(<Dashboard user={user} />)

    expect(await screen.findByText(/aún no ha enviado ninguna posición/)).toBeInTheDocument()
    const lastContact = screen.getByText('Última comunicación').nextElementSibling
    expect(lastContact?.querySelector('time')).toHaveAttribute('dateTime', device.lastUpdate)
  })

  it('does not auto-select when there are several vehicles', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device, { ...device, id: 8, name: 'Camión 02' }]),
    })
    renderWithProviders(<Dashboard user={user} />)

    expect(await screen.findByRole('combobox', { name: 'Vehículo' })).toHaveValue('')
    expect(
      screen.getByText('Selecciona un vehículo para ver su posición y estado.'),
    ).toBeInTheDocument()
  })

  it('shows a loading skeleton with the final layout, hidden from assistive tech', async () => {
    fakeTraccar({
      'GET /api/devices': () => new Promise(() => {}), // never resolves
    })
    renderWithProviders(<Dashboard user={user} />)

    const card = await screen.findByRole('region', { name: 'Vehículo' })
    expect(card).toHaveAttribute('aria-busy', 'true')
    expect(card).toHaveTextContent('Cargando datos del vehículo…')
    // Real labels are already in place; placeholder values are aria-hidden
    expect(screen.getByText('Velocidad')).toBeInTheDocument()
    expect(screen.getByText('00 km/h')).toHaveAttribute('aria-hidden', 'true')
  })

  it('reports a failed first position load as an error, not as "no position yet"', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': networkDown,
    })
    renderWithProviders(<Dashboard user={user} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hemos podido cargar la posición del vehículo',
    )
    expect(screen.queryByText(/aún no ha enviado ninguna posición/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('confirms when the connection recovers', async () => {
    const { routes } = fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    const { queryClient } = renderWithProviders(<Dashboard user={user} />)
    await screen.findByText('87 %')

    routes['GET /api/positions'] = networkDown
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.position(7) }))
    await screen.findByText(/Conexión inestable/)

    routes['GET /api/positions'] = () => json([position])
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.position(7) }))
    expect(await screen.findByText(/Conexión restablecida/)).toBeInTheDocument()
  })

  it('tells the operator when the browser goes offline', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    renderWithProviders(<Dashboard user={user} />)
    await screen.findByText('87 %')

    act(() => onlineManager.setOnline(false))
    expect(await screen.findByText(/Sin conexión a internet/)).toBeInTheDocument()

    act(() => onlineManager.setOnline(true))
    expect(await screen.findByText(/Conexión restablecida/)).toBeInTheDocument()
  })

  it('explains the wait when loading takes unusually long', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fakeTraccar({ 'GET /api/devices': () => new Promise(() => {}) })
    renderWithProviders(<Dashboard user={user} />)

    const card = await screen.findByRole('region', { name: 'Vehículo' })
    expect(card).toHaveTextContent('Cargando datos del vehículo…')

    act(() => vi.advanceTimersByTime(5000))
    expect(card).toHaveTextContent('Está tardando más de lo habitual')
    expect(screen.getByText('Está tardando más de lo habitual')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('offers logout as a way out when the vehicle list fails', async () => {
    const { fetchMock } = fakeTraccar({
      'GET /api/devices': networkDown,
      'DELETE /api/session': () => new Response(null, { status: 204 }),
    })
    renderWithProviders(<Dashboard user={user} />)

    await screen.findByRole('alert')
    const panel = screen.getByRole('complementary', { name: 'Estado del vehículo' })
    const [panelLogout] = [...panel.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Cerrar sesión'),
    )
    await userEvent.click(panelLogout)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/api/session' }),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('mounts the map for the selected vehicle once its position arrives', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    renderWithProviders(<Dashboard user={user} />)

    const map = await screen.findByTestId('vehicle-map')
    expect(map).toHaveAttribute('data-device', 'Camión 01')
    expect(map).toHaveAttribute('data-has-position', 'true')
  })

  it('asks to pick a vehicle on the map area when several exist', async () => {
    fakeTraccar({
      'GET /api/devices': () => json([device, { ...device, id: 8, name: 'Camión 02' }]),
    })
    renderWithProviders(<Dashboard user={user} />)

    expect(
      await screen.findByText('Selecciona un vehículo para verlo en el mapa.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('vehicle-map')).not.toBeInTheDocument()
  })
})
