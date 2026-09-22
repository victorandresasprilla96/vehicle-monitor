import userEvent from '@testing-library/user-event'
import { enableSpaceActivation } from './spaceActivation'

function setup() {
  const root = document.createElement('div')
  root.innerHTML = `
    <a href="#" role="button" aria-label="Acercar">+</a>
    <a href="https://www.openstreetmap.org/copyright">OSM</a>
  `
  document.body.append(root)
  const [zoomIn, plainLink] = root.querySelectorAll('a')
  const onZoom = vi.fn((e: Event) => e.preventDefault())
  const onLink = vi.fn((e: Event) => e.preventDefault())
  zoomIn.addEventListener('click', onZoom)
  plainLink.addEventListener('click', onLink)
  const cleanup = enableSpaceActivation(root)
  return { root, zoomIn, plainLink, onZoom, onLink, cleanup }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('enableSpaceActivation', () => {
  it('activates a role="button" link with Space', async () => {
    const { zoomIn, onZoom } = setup()
    zoomIn.focus()
    await userEvent.keyboard(' ')
    expect(onZoom).toHaveBeenCalledTimes(1)
  })

  it('still activates with Enter (native link behaviour, not doubled)', async () => {
    const { zoomIn, onZoom } = setup()
    zoomIn.focus()
    await userEvent.keyboard('{Enter}')
    expect(onZoom).toHaveBeenCalledTimes(1)
  })

  it('prevents Space from scrolling the page', () => {
    const { zoomIn } = setup()
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    zoomIn.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves ordinary links alone', async () => {
    const { plainLink, onLink } = setup()
    plainLink.focus()
    await userEvent.keyboard(' ')
    expect(onLink).not.toHaveBeenCalled()
  })

  it('cleans up its listeners', async () => {
    const { zoomIn, onZoom, cleanup } = setup()
    cleanup()
    zoomIn.focus()
    await userEvent.keyboard(' ')
    expect(onZoom).not.toHaveBeenCalled()
  })
})
