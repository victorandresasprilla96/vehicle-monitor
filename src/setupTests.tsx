import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia. Default: light scheme, full motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

// Leaflet needs real layout (container size, tiles). Component tests use this
// light double; the real map is covered by markerAnimator tests + browser E2E.
vi.mock('./components/VehicleMap/VehicleMap', () => ({
  default: ({ device, position }: { device: { name: string }; position: unknown }) => (
    <div
      data-testid="vehicle-map"
      data-device={device.name}
      data-has-position={String(!!position)}
    />
  ),
}))
