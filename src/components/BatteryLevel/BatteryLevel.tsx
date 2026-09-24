import { batteryTier, type BatteryTier } from '../../utils/battery'
import { AnimatedValue } from '../AnimatedValue/AnimatedValue'
import styles from './BatteryLevel.module.css'

const TIER_LABEL: Record<BatteryTier, string> = {
  ok: '',
  low: ' (baja)',
  critical: ' (crítica)',
}

/**
 * "58 %" plus a level bar. The bar is decorative (the number carries the
 * value); colour only marks thresholds (≤ 20 % low, ≤ 10 % critical) and the
 * tier is also spoken — never colour alone.
 * The bar is absolutely positioned by the parent tile (see StatusCard).
 */
export function BatteryLevel({ level }: { level: number }) {
  const value = Math.round(Math.min(100, Math.max(0, level)))
  const tier = batteryTier(value)

  return (
    <span className={styles.battery} data-tier={tier}>
      {/* Only the number animates: a positioned wrapper around the whole
          component would trap the absolutely-positioned bar inside it */}
      <AnimatedValue value={value}>
        <span className={styles.value}>
          {value} %<span className="sr-only">{TIER_LABEL[tier]}</span>
        </span>
      </AnimatedValue>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${value}%` }} />
      </span>
    </span>
  )
}
