import type { DeviceStatus } from '../api/types'

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  online: 'En línea',
  offline: 'Sin conexión',
  unknown: 'Sin señal reciente',
}
