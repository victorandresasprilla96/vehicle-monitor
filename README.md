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

## Capa de datos y resiliencia

- [`api/client.ts`](src/api/client.ts) — `fetch` con cookie de sesión, *timeout* de 10 s combinado con la cancelación de TanStack Query, y **errores tipados** (`auth`, `network`, `timeout`, `server`, `unknown`). Los cuerpos de error de Traccar (trazas Java) nunca llegan a la UI.
- [`api/queryClient.ts`](src/api/queryClient.ts) — reintentos con *backoff* exponencial (1 s → 2 s → 4 s) solo para fallos transitorios; un 401 no se reintenta. Si la sesión caduca durante el polling, se vuelve al login con un aviso.
- Polling: posición cada `VITE_POLL_INTERVAL_MS` (5 s) y lista de dispositivos cada 10 s para mantener el estado de conexión al día. Se pausa en pestañas en segundo plano.
- Si un poll falla y ya había datos, la tarjeta conserva los últimos valores conocidos y lo indica ("Conexión inestable"), en lugar de vaciarse.
- El vehículo seleccionado vive en la URL (`?device=123`): recargar o compartir el enlace conserva la vista.

## Estados de carga y error

| Situación | Qué ve el operador |
|---|---|
| Carga inicial | Skeletons con la **misma estructura y tipografía** que el contenido real (texto de relleno transparente), así que no hay saltos: **CLS medido = 0**. Aparecen tras 300 ms para no destellar en respuestas rápidas. |
| Servidor caído al arrancar | Error a pantalla completa, "Reintentar" con el foco, **reintento automático cada 15 s** (pantallas desatendidas) y detalles técnicos plegados para soporte. |
| Falla una carga del panel | Error compacto dentro del panel o la tarjeta, sin tapar el resto de la interfaz. |
| Falla el polling con datos en pantalla | Banner flotante "Conexión inestable" desde el **primer** fallo (no tras agotar reintentos) y valores atenuados. Al recuperarse: "Conexión restablecida". |
| Navegador sin conexión | Banner "Sin conexión a internet" (TanStack Query pausa las consultas en lugar de fallar). |

Accesibilidad: los skeletons son `aria-hidden` y la tarjeta usa `aria-busy` con un aviso de carga; solo el mensaje de error va en `role="alert"`, con la cuenta atrás fuera para que no se anuncie cada segundo, y los banners usan `role="status"` (educado, no interrumpe).

## Mapa y marcador

- **Leaflet + teselas de OpenStreetMap** (sin API key). El tema se aplica con un filtro CSS sobre la capa de teselas (`--map-tile-filter`): desaturado en claro e invertido en oscuro, así que cambiar de tema no recarga teselas. El mapa se carga de forma diferida (`React.lazy`) y no se descarga en el login.
- **Marcador SVG**: disco con el color del estado (verde en línea, gris sin conexión, ámbar sin señal reciente), una flecha que **rota según `course`** y un pulso solo cuando el vehículo está en línea.
- **Movimiento suave** ([`markerAnimator.ts`](src/components/VehicleMap/markerAnimator.ts)): interpolación con `requestAnimationFrame` de 1.5 s y *ease-out*. La rotación toma el camino más corto, los saltos de más de 2 km se muestran como salto y, si llega una posición nueva a mitad de animación, continúa desde donde está. Escribe directamente en Leaflet, **sin re-renderizar React** en cada frame.
- **Seguimiento de cámara**: `panTo` con `easeLinearity: 1/3` (equivale a *ease-out cubic*, la misma curva que el marcador), así que el vehículo se mantiene centrado (medido: desviación ≤ 0.9 px). Arrastrar el mapa o moverlo con las flechas desactiva el seguimiento; el botón **"Seguir vehículo"** (`aria-pressed`) lo reactiva.
- **Limitación conocida**: las teselas públicas de OSM son adecuadas para una demo, pero su [política de uso](https://operations.osmfoundation.org/policies/tiles/) no admite tráfico intenso; en producción se usaría un proveedor con clave (MapTiler, Stadia…) cambiando solo `TILE_URL`.
- **Accesibilidad**: contenedor `role="application"` con instrucciones de teclado, controles de zoom en español ("Acercar" / "Alejar") de 40 px y operables con **Enter y Space** (Leaflet los renderiza como `<a role="button">`, que por defecto solo responde a Enter), el marcador con `role="img"` y descripción ("Camión 01, en línea, 43 km/h, rumbo noreste"), y `prefers-reduced-motion` desactiva interpolación, pulso y animaciones de zoom.

## Tarjeta de estado y micro-interacciones

Criterio: **guiar la mirada sin distraer**. Con polling cada 5 s, animar todo sería ruido.

| Dato | Comportamiento |
|---|---|
| Estado de conexión | Punto con **pulso** solo si está en línea (anillo hueco si no hay conexión, así que la forma distingue además del color); la etiqueta hace un fundido al cambiar. |
| Velocidad | Fundido suave en cada cambio; **realce de color solo si varía ≥ 5 km/h**. |
| Batería | Icono con nivel; el color marca **umbrales** (≤ 20 % aviso, ≤ 10 % crítico), y el umbral también se anuncia en texto. |
| Última actualización | Tiempo relativo que se actualiza solo ("Hace 25 segundos") sobre la hora exacta; pasa a ámbar y se marca "datos antiguos" si supera 2 min. Solo ese texto se re-renderiza cada segundo. |
| Coordenadas | Sin animación, porque cambian en cada consulta. |

**Lectores de pantalla** (`role="status"`, educado): solo se anuncian cambios con significado, es decir, estado de conexión, *"se ha detenido"* / *"se ha puesto en marcha"*, cruce de umbral de batería y saltos de velocidad de ≥ 20 km/h. Nunca se lee la velocidad en cada consulta, y cambiar de vehículo reinicia la referencia en silencio.

El realce es un pseudo-elemento detrás del texto (sin impacto en el layout) y se reinicia cambiando la `key` del elemento, sin temporizadores. Con `prefers-reduced-motion` no hay animaciones.

## Diseño adaptable

| Pantalla | Distribución |
|---|---|
| Móvil y tablet en vertical | Mapa a pantalla completa y panel como **bottom sheet**. Plegada muestra vehículo, estado y velocidad; se expande con un toque en el asa, con Enter o Space, o arrastrando. |
| Móvil en horizontal, ventana con zoom 200 % | Panel al lado del mapa (regla de "horizontal y poca altura"), para que los datos no queden fuera de la pantalla. |
| Tablet horizontal y escritorio (≥ 960 px) | Panel lateral fluido (280–380 px) y mapa. El panel se puede **plegar** para ver el mapa completo (`aria-expanded`); el mapa conserva el centro. |

**Selector de vehículo según el tamaño de la flota**

| Flota | Control |
|---|---|
| ≤ 6 vehículos con panel lateral | **Lista** con el estado de cada vehículo a la vista (radios nativos en un `fieldset`, operable con las flechas). |
| > 6 vehículos | **Combobox con búsqueda** según el patrón *editable combobox* de WAI-ARIA APG (`aria-activedescendant`, ↓/↑, Enter, Esc). La búsqueda ignora tildes y mayúsculas y admite varias palabras ("cam 02"), y el número de resultados se anuncia. |
| Pocos vehículos en móvil | `<select>` nativo (selector nativo del sistema en pantallas táctiles). |

**Bottom sheet accesible**
- El arrastre es opcional: el asa es un botón (WCAG 2.5.1).
- El contenido nunca se oculta a las tecnologías de asistencia, así que los avisos en directo siguen funcionando. Si el foco entra en la parte tapada, la hoja se expande sola.
- Esc la pliega y devuelve el foco al asa.
- Los controles del mapa y la atribución se colocan por encima de la hoja, y la cámara centra el vehículo en la **zona visible** del mapa.

**Verificado en Chrome**
- **Reflow (WCAG 1.4.10)**: sin scroll horizontal a 320 px; "Cerrar sesión" pasa a icono y conserva su nombre accesible.
- **Texto al 200 % (WCAG 1.4.4)**: probado con el tamaño de letra del navegador a 32 px (no con un estilo raíz, que no afecta a las media queries en `rem`). Sin desbordamiento ni texto cortado en escritorio ni en móvil.
- **8 tamaños** (320, 390, 844×390, 768, 1024, 1280, 1280 al 200 % y 1920): sin desbordamiento horizontal y con la velocidad visible sin scroll. **CLS = 0** en la carga, tanto en escritorio (lista) como en móvil (hoja).

## Datos en tiempo real (simulador)

Una cuenta nueva no tiene dispositivos. Para ver el vehículo moverse:

1. En Traccar, crea un dispositivo (**Dispositivos → +**) y anota su *Identificador* (`uniqueId`).
2. Ejecuta el simulador, que envía posiciones por el protocolo OsmAnd (HTTP, puerto 5055):

   ```bash
   npm run simulate -- <uniqueId> 5   # una posición cada 5 s
   ```

   Recorre en bucle Sol → Gran Vía → Plaza de España → Palacio Real con conducción realista: velocidad gradual (15–55 km/h, ±4 km/h por envío), paradas ocasionales, rumbo real y batería que se descarga y hace una parada de recarga al bajar del 8 %. Hay una segunda ruta alrededor del Retiro para simular otro vehículo a la vez:

   ```bash
   npm run simulate -- <uniqueId-2> 4 retiro
   ```

   `TRACCAR_OSMAND_URL` permite apuntar a otro servidor.

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
