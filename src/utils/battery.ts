export const BATTERY_LOW = 20
export const BATTERY_CRITICAL = 10

export type BatteryTier = 'ok' | 'low' | 'critical'

export function batteryTier(level: number): BatteryTier {
  if (level <= BATTERY_CRITICAL) return 'critical'
  if (level <= BATTERY_LOW) return 'low'
  return 'ok'
}
