import clsx from 'clsx'
import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps {
  /**
   * Placeholder text with the same shape as the real value (e.g. "00 km/h").
   * It's rendered transparent inside the real typography, so the skeleton has
   * exactly the width/height the content will have: zero layout shift by
   * construction, no magic pixel sizes to keep in sync.
   */
  text?: string
  /** For non-text blocks (controls, map): explicit box size */
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  radius?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

/** Decorative: hidden from assistive tech. Announce loading on the container (aria-busy + status text). */
export function Skeleton({ text, width, height, radius = 'sm', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.skeleton, text ? styles.text : styles.block, className)}
      data-radius={radius}
      style={{ width, height }}
    >
      {text}
    </span>
  )
}
