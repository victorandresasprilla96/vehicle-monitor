# Vehicle Monitor

Monitor de vehículo en tiempo real (Control Room Component) conectado a la API de [Traccar](https://www.traccar.org/).

Prueba técnica — Design Engineer (UX/UI).

## Stack

- React 19 + TypeScript + Vite
- TanStack Query (polling, reintentos, caché)
- Leaflet + react-leaflet
- CSS Custom Properties (design tokens)
- oxlint (con reglas `jsx-a11y`), Prettier, Vitest + Testing Library

## Requisitos

- Node.js ≥ 20 (probado con v24 LTS). Recomendado instalarlo con [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm install --lts
  ```

## Ejecución local

```bash
npm install
cp .env.example .env   # opcional, los valores por defecto funcionan
npm run dev
```

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con proxy a Traccar |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | oxlint (incluye accesibilidad `jsx-a11y`) |
| `npm run test` | Tests con Vitest (`test:watch` en modo watch) |
| `npm run format` | Prettier sobre `src/` y `scripts/` |
| `npm run simulate -- <uniqueId>` | Simulador GPS: mueve un dispositivo por Madrid |

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_TRACCAR_TARGET` | `https://demo4.traccar.org` | Servidor Traccar al que el proxy reenvía `/api` |
| `VITE_API_BASE` | `/api` | Ruta base que usa la app (siempre el proxy del mismo origen) |
| `VITE_POLL_INTERVAL_MS` | `5000` | Intervalo de polling de posiciones |

## Conexión con Traccar (CORS y sesión)

Los servidores demo de Traccar no aceptan peticiones desde otros orígenes y la sesión viaja en la cookie `JSESSIONID`. Por eso la app nunca llama a Traccar directamente, sino a `/api` en su propio origen:

- **Desarrollo:** `server.proxy` en [`vite.config.ts`](vite.config.ts).
- **Producción (Vercel):** `rewrites` en [`vercel.json`](vercel.json).

Endpoints utilizados:

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/session` | Login (`application/x-www-form-urlencoded`: `email`, `password`) |
| `GET` | `/api/session` | Recuperar sesión existente |
| `DELETE` | `/api/session` | Logout |
| `GET` | `/api/devices` | Lista de dispositivos |
| `GET` | `/api/positions?deviceId={id}` | Última posición del dispositivo (polling) |

> **Credenciales:** las credenciales de ejemplo `admin/admin` y `demo/demo` son rechazadas actualmente (401) por los servidores demo. Los servidores tienen el registro abierto: crea una cuenta en https://demo4.traccar.org y úsala en el login de la app.

## Datos en tiempo real (simulador)

Una cuenta nueva no tiene dispositivos. Para ver el vehículo moverse:

1. En Traccar, crea un dispositivo (**Dispositivos → +**) y anota su *Identificador* (`uniqueId`).
2. Ejecuta el simulador, que envía posiciones por el protocolo OsmAnd (HTTP, puerto 5055):

   ```bash
   npm run simulate -- <uniqueId> 5   # una posición cada 5 s
   ```

   Recorre en bucle Sol → Gran Vía → Plaza de España → Palacio Real, con velocidad variable (20–50 km/h), rumbo real y batería descendente. `TRACCAR_OSMAND_URL` permite apuntar a otro servidor.

## Sistema de diseño

Todos los estilos consumen *design tokens* definidos como CSS Custom Properties en [`src/styles/`](src/styles):

| Fichero | Contenido |
|---|---|
| [`tokens.css`](src/styles/tokens.css) | Escalas independientes del tema: tipografía, espaciado (base 4 px), radios, motion, layout, z-index |
| [`themes.css`](src/styles/themes.css) | Paleta semántica (`--color-*`) y sombras para `light` y `dark`, con los mismos nombres en ambos |
| [`global.css`](src/styles/global.css) | Reset, foco visible (`:focus-visible`), skip link, utilidades y `prefers-reduced-motion` |

- **Contraste verificado por test:** [`contrast.test.ts`](src/styles/contrast.test.ts) analiza `themes.css` y comprueba con la fórmula WCAG 2.1 cada par texto/fondo (≥ 4.5:1) y controles/foco (≥ 3:1) en ambos temas. Un cambio de color que rompa AA hace fallar los tests.
- **Tema:** respeta `prefers-color-scheme` hasta que el usuario elige uno, y entonces lo persiste en `localStorage`. Un script inline en `index.html` lo aplica antes del primer pintado (sin destellos) y los colores hacen un *cross-fade* solo durante el cambio.
- **Tipografía:** Inter (UI) y JetBrains Mono (datos), autoalojadas con `@fontsource` (sin peticiones a terceros), con cifras tabulares para valores en tiempo real.
