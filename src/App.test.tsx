import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { Device, Position } from './api/types'
import { renderWithProviders } from './test/render'

const user = {
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
  speed: 27, // knots → 50 km/h
  course: 45,
  accuracy: 0,
  address: null,
  attributes: { batteryLevel: 87 },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Minimal fake Traccar server: routes by method + path. */
function fakeTraccar(routes: Record<string, () => Response | Promise<Response>>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input))
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const route = routes[key]
    if (!route) throw new Error(`Unmocked request: ${key}`)
    return route()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the login form when there is no session (404)', async () => {
    fakeTraccar({ 'GET /api/session': () => new Response('', { status: 404 }) })
    renderWithProviders(<App />)

    expect(await screen.findByRole('heading', { name: 'Monitor de flota' })).toBeInTheDocument()
    expect(screen.getByLabelText('Usuario o email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('validates empty fields and focuses the first invalid one', async () => {
    fakeTraccar({ 'GET /api/session': () => new Response('', { status: 404 }) })
    renderWithProviders(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

    const email = screen.getByLabelText('Usuario o email')
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Introduce tu usuario o email.')
  })

  it('explains wrong credentials without leaking the server error', async () => {
    fakeTraccar({
      'GET /api/session': () => new Response('', { status: 404 }),
      'POST /api/session': () =>
        new Response('jakarta.ws.rs.WebApplicationException: HTTP 401', { status: 401 }),
    })
    renderWithProviders(<App />)

    await userEvent.type(await screen.findByLabelText('Usuario o email'), 'op@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Usuario o contraseña incorrectos')
    expect(alert).not.toHaveTextContent(/jakarta|401/)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true')
  })

  it('logs in, auto-selects the only vehicle and shows its data in km/h', async () => {
    fakeTraccar({
      'GET /api/session': () => new Response('', { status: 404 }),
      'POST /api/session': () => json(user),
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    renderWithProviders(<App />)

    await userEvent.type(await screen.findByLabelText('Usuario o email'), 'op@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Camión 01' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Vehículo' })).toHaveValue('7')
    expect(window.location.search).toBe('?device=7')

    const speed = await screen.findByText('Velocidad')
    expect(speed.nextElementSibling).toHaveTextContent('50 km/h')
    expect(screen.getByText('87 %')).toBeInTheDocument()
  })

  it('shows a retryable error when the server is unreachable', async () => {
    const fetchMock = fakeTraccar({
      'GET /api/session': () => Promise.reject(new TypeError('Failed to fetch')),
    })
    renderWithProviders(<App />)

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No logramos conectar con el servidor de seguimiento',
    )
    await waitFor(() => expect(retry).toHaveFocus())

    await userEvent.click(retry)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns to login with an explanation when the session expires mid-shift', async () => {
    fakeTraccar({
      'GET /api/session': () => json(user),
      'GET /api/devices': () => new Response('', { status: 401 }),
    })
    renderWithProviders(<App />)

    const notice = await screen.findByText(/Tu sesión ha caducado/)
    expect(notice).toHaveAttribute('role', 'status')
    expect(screen.getByLabelText('Usuario o email')).toBeInTheDocument()
  })
})
