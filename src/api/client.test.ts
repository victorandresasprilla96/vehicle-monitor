import { request } from './client'
import { ApiError } from './errors'
import { getLatestPosition, getSession, login } from './traccar'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function expectKind(promise: Promise<unknown>, kind: ApiError['kind']) {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect((error as ApiError).kind).toBe(kind)
}

describe('request error classification', () => {
  it('maps 401 to auth', async () => {
    fetchMock.mockResolvedValue(
      new Response('jakarta.ws.rs.WebApplicationException…', { status: 401 }),
    )
    await expectKind(request('/devices'), 'auth')
  })

  it('maps 5xx to server', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }))
    await expectKind(request('/devices'), 'server')
  })

  it('maps a rejected fetch (offline, CORS) to network', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expectKind(request('/devices'), 'network')
  })

  it('maps a slow response to timeout', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    await expectKind(request('/devices', { timeoutMs: 20 }), 'timeout')
  })

  it('maps malformed JSON to unknown', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))
    await expectKind(request('/devices'), 'unknown')
  })

  it('lets caller cancellation propagate as-is', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const promise = request('/devices', { signal: controller.signal })
    controller.abort()
    const error = await promise.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as DOMException).name).toBe('AbortError')
  })

  it('never exposes the server body in the error message', async () => {
    fetchMock.mockResolvedValue(
      new Response('java.lang.NullPointerException at …', { status: 500 }),
    )
    const error = (await request('/devices').catch((e: unknown) => e)) as ApiError
    expect(error.message).not.toContain('java')
  })
})

describe('traccar endpoints', () => {
  it('login posts form-encoded credentials with the session cookie', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Op' }))
    await login('op@example.com', 's3cret')

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/session$/)
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('include')
    expect(init?.body).toBeInstanceOf(URLSearchParams)
    expect(String(init?.body)).toBe('email=op%40example.com&password=s3cret')
  })

  it('getSession treats 404 (no session) as logged out', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    await expect(getSession()).resolves.toBeNull()
  })

  it('getSession still surfaces network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expectKind(getSession(), 'network')
  })

  it('getLatestPosition queries by device and returns null when there is none', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    await expect(getLatestPosition(42)).resolves.toBeNull()
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/positions\?deviceId=42$/)
  })
})
