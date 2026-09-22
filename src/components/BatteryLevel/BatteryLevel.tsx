import { batteryTier, type BatteryTier } from '../../utils/battery'
import styles from './BatteryLevel.module.css'

const TIER_LABEL: Record<BatteryTier, string> = {
  ok: '',
  low: ' (baja)',
  critical: ' (crítica)',
}

/**
 * Battery glyph filled to the level + percentage. Colour only marks thresholds
 * (≤ 20 % low, ≤ 10 % critical) — and the tier is also spoken, never colour alone.
 */
export function BatteryLevel({ level }: { level: number }) {
  const value = Math.round(Math.min(100, Math.max(0, level)))
  const tier = batteryTier(value)

  return (
    <span className={styles.battery} data-tier={tier}>
      <svg className={styles.glyph} viewBox="0 0 26 14" width="26" height="14" aria-hidden="true">
        <rect x="0.75" y="0.75" width="21.5" height="12.5" rx="3" className={styles.shell} />
        <rect x="23.25" y="4.5" width="2" height="5" rx="1" className={styles.tip} />
        <rect
          x="2.5"
          y="2.5"
          width={Math.max(1.5, (18 * value) / 100)}
          height="9"
          rx="1.5"
          className={styles.fill}
        />
      </svg>
      <span>
        {value} %<span className="sr-only">{TIER_LABEL[tier]}</span>
      </span>
    </span>
  )
}
