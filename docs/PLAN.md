# Plan de trabajo: Monitor de Vehículo en Tiempo Real (React + Traccar)

## 0. Decisiones técnicas

| Área | Elección | Motivo |
|---|---|---|
| Scaffolding | Vite + React 18 + TypeScript | Arranque rápido y build ligero para Vercel o Netlify |
| Estilos | CSS Custom Properties + CSS Modules | Tokens de diseño explícitos y auditables |
| Datos y polling | TanStack Query | `refetchInterval`, reintentos, caché y estados loading/error |
| Estado global | React Context (sesión y tema) | Poco estado global |
| Mapa | Leaflet + react-leaflet | Ligero, accesible por teclado, tiles claro/oscuro (CARTO) |
| Tipografía | Inter / IBM Plex Sans + tabular-nums | Legibilidad y cifras estables |
| Calidad | ESLint + jsx-a11y, Prettier, Vitest + Testing Library, axe-core | Accesibilidad verificable |
| Deploy | Vercel con rewrites como proxy | Soluciona el CORS de Traccar |

> **Riesgo crítico: CORS y cookies.** Traccar usa la cookie `JSESSIONID` y los demos no permiten
> peticiones desde otros orígenes. Se usa un proxy del mismo origen: `server.proxy` de Vite en local
> y `rewrites` de `vercel.json` en producción. El WebSocket no pasa por los rewrites de Vercel,
> por eso el mecanismo principal es el polling.

## Fase 1: Entorno y scaffolding (≈1 h)
- Instalar Node LTS con nvm
- `npm create vite@latest vehicle-monitor -- --template react-ts`
- Dependencias: `@tanstack/react-query leaflet react-leaflet clsx`; dev: `@types/leaflet eslint-plugin-jsx-a11y prettier vitest @testing-library/react @testing-library/jest-dom jsdom`
- `git init`, repositorio público en GitHub
- `.env.example`: `VITE_TRACCAR_TARGET`, `VITE_API_BASE`, `VITE_POLL_INTERVAL_MS`
- Proxy `/api` en `vite.config.ts`

## Fase 2: Estructura
```
src/
├─ api/        client.ts, traccar.ts, types.ts
├─ hooks/      useSession, useDevices, usePosition, useAnimatedLatLng, useRelativeTime, useTheme
├─ components/ LoginForm, DeviceSelector, StatusCard, VehicleMap, PulseIndicator,
│              AnimatedValue, Skeleton, ErrorState, ThemeToggle
├─ styles/     tokens.css, themes.css, global.css
├─ utils/      units.ts, format.ts
└─ App.tsx
```

## Fase 3: Sistema de diseño y tokens (≈2–3 h)
- Paleta neutra, de acento y semántica (online, offline, unknown, danger) para claro y oscuro. Contraste ≥ 4.5:1 en texto y ≥ 3:1 en UI.
- Escala de espaciado en base 4, escala tipográfica modular, radios, sombras y motion.
- `:focus-visible` global con outline de 2px y offset; nunca `outline: none` sin reemplazo.
- `prefers-reduced-motion` desactiva pulso, shimmer e interpolación.
- `data-theme` en `<html>`, inicializado desde `prefers-color-scheme` y `localStorage`, con script inline anti-parpadeo.

## Fase 4: API y resiliencia (≈3 h)
- `client.ts`: `credentials: 'include'`, timeout con AbortController, errores tipados (Auth, Network/CORS, Server, Timeout).
- `POST /api/session` (x-www-form-urlencoded), `GET /api/session`, `GET /api/devices`, `GET /api/positions?deviceId=`, `DELETE /api/session`.
- TanStack Query: backoff exponencial sin reintentar los 401, `refetchInterval` de 5 s, sin polling en segundo plano, `keepPreviousData`.
- `speedKmh = speed * 1.852`, `battery = attributes.batteryLevel`, `status = device.status`.
- `deviceId` en la URL (`?device=123`).

## Fase 5: Estados críticos de la UX (≈4 h)
- Skeletons con la forma exacta del contenido y dimensiones reservadas (CLS 0); solo aparecen tras unos 300 ms; `aria-busy`.
- `ErrorState` por tipo de error, con micro-copy empático, botón Reintentar que recibe el foco y `role="alert"`.
- Si falla el polling y ya hay datos: banner "Conexión inestable" y datos marcados como stale.
- Estados vacíos: sin dispositivos, sin posición.

## Fase 6: Mapa y marcador (≈3–4 h)
- Tiles de CARTO `light_all` / `dark_all` según el tema.
- Marcador SVG en `divIcon`, rotado según `course`, con color por estado y halo pulsante.
- `useAnimatedLatLng`: interpolación con rAF y ease-out (~1–1.5 s); la rotación toma el camino más corto; teleport si el salto supera ~2 km; se actualiza con `marker.setLatLng()` sin re-render de React.
- Auto-centrado con `panTo`, modo "Seguir vehículo" y botón "Recentrar".
- `aria-label` en el mapa y título descriptivo en el marcador.

## Fase 7: Tarjeta de estado (≈3 h)
- Jerarquía: nombre y estado → velocidad en grande → batería, última actualización, coordenadas y rumbo.
- `<section aria-labelledby>` + `<dl>/<dt>/<dd>`.
- Región `aria-live="polite"` que anuncia solo los cambios relevantes.
- `AnimatedValue`: crossfade y realce que se desvanece.
- El estado lleva texto además del color (WCAG 1.4.1).
- `Intl.RelativeTimeFormat('es')` + `<time dateTime>` con la hora exacta.

## Fase 8: Responsive y navegación (≈2 h)
- Escritorio: panel lateral + mapa. Tablet: panel colapsable. Móvil: bottom sheet.
- Selector con patrón combobox de WAI-ARIA APG o `<select>` nativo.
- Skip link, `<header>` y `<main>`; funciona con zoom al 200 %.

## Fase 9: QA de accesibilidad (≈2 h)
- [ ] Recorrido completo solo con teclado
- [ ] VoiceOver
- [ ] axe y Lighthouse (Accesibilidad 100, CLS < 0.1)
- [ ] Contraste en ambos temas
- [ ] reduced-motion
- [ ] Simulación de fallos: servidor inválido, credenciales erróneas, Offline, Slow 3G
- [ ] Tests unitarios: nudos, fechas, ángulos, ErrorState

## Fase 10: Despliegue y entregables (≈2 h + vídeo)
- `vercel.json` con los rewrites de `/api` y el fallback SPA.
- README: instalación, variables de entorno, endpoints, proxy/CORS, decisiones de diseño, uso de IA.
- Vídeo de 5–10 min. Ir anotando las correcciones hechas a la IA.

## Cronograma
| Día | Fases |
|---|---|
| 1 | 1, 2, 3, 4 |
| 2 | 5, 6 |
| 3 | 7, 8, 9 |
| 4 | 10 |
