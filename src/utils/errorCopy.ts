import { isApiError, type ApiErrorKind } from '../api/errors'

export interface ErrorCopy {
  title: string
  description: string
}

/**
 * User-facing copy for each failure type. Tone: calm, specific, no blame,
 * always says what happens next. Never exposes status codes or server text.
 */
const COPY: Record<ApiErrorKind, ErrorCopy> = {
  auth: {
    title: 'Usuario o contraseña incorrectos',
    description: 'Revisa los datos e inténtalo de nuevo. Distingue mayúsculas y minúsculas.',
  },
  network: {
    title: 'No logramos conectar con el servidor de seguimiento',
    description:
      'Puede que el servidor esté fuera de servicio o que tu conexión se haya interrumpido. Tus datos no se han perdido.',
  },
  timeout: {
    title: 'El servidor tarda más de lo habitual',
    description: 'Está respondiendo muy despacio. Espera unos segundos y vuelve a intentarlo.',
  },
  server: {
    title: 'El servidor de seguimiento tiene un problema',
    description: 'No es un fallo tuyo. Suele resolverse en unos minutos; vuelve a intentarlo.',
  },
  unknown: {
    title: 'Algo no ha ido como esperábamos',
    description: 'Hemos recibido una respuesta inesperada del servidor. Vuelve a intentarlo.',
  },
}

export function errorCopy(error: unknown): ErrorCopy {
  return COPY[isApiError(error) ? error.kind : 'unknown']
}
