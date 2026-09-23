import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { Device, Position } from './api/types'
import { renderWithProviders } from './test/render'
import { axeViolations } from './test/axe'

/** Automated WCAG regression guard over the app's main screens and states. */

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

function fakeTraccar(routes: Record<string, () => Response | Promise<Response>>) {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const key = `${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`
      const route = routes[key]
      if (!route) throw new Error(`Unmocked request: ${key}`)
      return route()
    }),
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('accessibility (axe-core, WCAG 2.2 AA)', () => {
  it('login screen', async () => {
    fakeTraccar({})
    renderWithProviders(<App />)
    await screen.findByLabelText('Usuario o email')
    expect(await axeViolations()).toEqual([])
  })

  it('login with validation and server errors', async () => {
    localStorage.setItem('vm-has-session', '1')
    fakeTraccar({
      'GET /api/session': () => new Response('', { status: 404 }),
      'POST /api/session': () => new Response('', { status: 401 }),
    })
    renderWithProviders(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(await axeViolations()).toEqual([])

    await userEvent.type(screen.getByLabelText('Usuario o email'), 'op@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByRole('alert')
    expect(await axeViolations()).toEqual([])
  })

  it('dashboard with live data', async () => {
    localStorage.setItem('vm-has-session', '1')
    fakeTraccar({
      'GET /api/session': () => json({ id: 1, name: 'Operador' }),
      'GET /api/devices': () => json([device]),
      'GET /api/positions': () => json([position]),
    })
    renderWithProviders(<App />)
    await screen.findByText('87 %')
    expect(await axeViolations()).toEqual([])
  })

  it('full-screen server error', async () => {
    localStorage.setItem('vm-has-session', '1')
    fakeTraccar({ 'GET /api/session': () => Promise.reject(new TypeError('Failed to fetch')) })
    renderWithProviders(<App />)
    await screen.findByRole('button', { name: 'Reintentar' })
    expect(await axeViolations()).toEqual([])
  })
})
