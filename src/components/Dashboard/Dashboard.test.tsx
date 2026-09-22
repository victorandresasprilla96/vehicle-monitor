import { act, screen, within } from '@testing-library/react'
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

    expect(await screen.findByText(/Conexión inestable/)).toHaveAttribute('role', 'status')
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
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

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
})
