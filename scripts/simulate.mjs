#!/usr/bin/env node
// Simulates a GPS tracker driving a loop around central Madrid.
// Sends positions to Traccar using the OsmAnd protocol (HTTP, port 5055).
//
// Usage: npm run simulate -- <deviceUniqueId> [intervalSeconds] [route]
//   route: "centro" (default) or "retiro"
//   TRACCAR_OSMAND_URL overrides the target (default http://demo4.traccar.org:5055)

const uniqueId = process.argv[2] ?? process.env.TRACCAR_DEVICE_UNIQUE_ID
const intervalS = Number(process.argv[3] ?? 5)
const routeName = process.argv[4] ?? 'centro'
const target = process.env.TRACCAR_OSMAND_URL ?? 'http://demo4.traccar.org:5055'

if (!uniqueId) {
  console.error('Usage: npm run simulate -- <deviceUniqueId> [intervalSeconds] [centro|retiro]')
  process.exit(1)
}

const ROUTES = {
  // Closed loop: Puerta del Sol → Gran Vía → Plaza de España → Palacio Real → Sol
  centro: [
    [40.4169, -3.7035],
    [40.4199, -3.7016],
    [40.4203, -3.7058],
    [40.4224, -3.7122],
    [40.4231, -3.7153],
    [40.4192, -3.7142],
    [40.4179, -3.7143],
    [40.4153, -3.7101],
    [40.4155, -3.7074],
    [40.4169, -3.7035],
  ],
  // Closed loop: Cibeles → Puerta de Alcalá → around El Retiro → Atocha → Prado → Cibeles
  retiro: [
    [40.4193, -3.6931],
    [40.42, -3.6886],
    [40.4213, -3.6829],
    [40.4178, -3.6763],
    [40.4103, -3.6784],
    [40.4077, -3.6862],
    [40.4088, -3.6905],
    [40.4138, -3.6925],
    [40.4193, -3.6931],
  ],
}

const route = ROUTES[routeName]
if (!route) {
  console.error(`Unknown route "${routeName}". Use: ${Object.keys(ROUTES).join(', ')}`)
  process.exit(1)
}

const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

function distanceM([lat1, lon1], [lat2, lon2]) {
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function bearing([lat1, lon1], [lat2, lon2]) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

let segment = 0
let progressM = 0
let battery = 60 + Math.random() * 40
let speedKmh = 30
// Driving behaviour: 'driving' | 'stopped' (traffic light/delivery) | 'charging'
let mode = 'driving'
let modeTicksLeft = 0

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Realistic urban behaviour: gradual speed, occasional stops, a charging stop when low. */
function nextSpeed() {
  if (mode === 'charging') {
    battery = Math.min(100, battery + 6)
    if (battery >= 95) mode = 'driving'
    return 0
  }
  if (mode === 'stopped') {
    if (--modeTicksLeft <= 0) mode = 'driving'
    return 0
  }
  if (battery <= 8) {
    mode = 'charging'
    return 0
  }
  if (Math.random() < 0.04) {
    mode = 'stopped'
    modeTicksLeft = 3 + Math.floor(Math.random() * 4) // 12–24 s at 4 s/tick
    return 0
  }
  // Accelerate from a stop, then drift ±4 km/h within 15–55 km/h
  const base = speedKmh < 5 ? 18 : speedKmh
  return clamp(base + (Math.random() - 0.5) * 8, 15, 55)
}

async function tick() {
  const from = route[segment]
  const to = route[(segment + 1) % route.length]
  const segLen = distanceM(from, to)

  speedKmh = nextSpeed()
  progressM += (speedKmh / 3.6) * intervalS

  while (progressM >= segLen) {
    progressM -= segLen
    segment = (segment + 1) % (route.length - 1)
  }

  const a = route[segment]
  const b = route[segment + 1]
  const t = progressM / distanceM(a, b)
  const lat = a[0] + (b[0] - a[0]) * t
  const lon = a[1] + (b[1] - a[1]) * t
  const course = bearing(a, b)
  const speedKnots = speedKmh / 1.852
  if (mode === 'driving') battery = Math.max(1, battery - 0.25)

  const params = new URLSearchParams({
    id: uniqueId,
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
    speed: speedKnots.toFixed(2),
    bearing: course.toFixed(1),
    batt: battery.toFixed(0),
    timestamp: String(Math.floor(Date.now() / 1000)),
  })

  try {
    const res = await fetch(`${target}/?${params}`)
    console.log(
      `${new Date().toLocaleTimeString()}  ${res.status}  ${lat.toFixed(5)}, ${lon.toFixed(5)}  ` +
        `${speedKmh.toFixed(0)} km/h  ${course.toFixed(0)}°  ${battery.toFixed(0)}%  ${mode}`,
    )
  } catch (err) {
    console.error(`${new Date().toLocaleTimeString()}  send failed: ${err.message}`)
  }
}

console.log(
  `Simulating device "${uniqueId}" on route "${routeName}" → ${target} every ${intervalS}s (Ctrl+C to stop)`,
)
tick()
setInterval(tick, intervalS * 1000)
