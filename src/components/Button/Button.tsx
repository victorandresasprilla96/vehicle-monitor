import clsx from 'clsx'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
  /**
   * Busy state. Uses aria-disabled instead of `disabled` so the button keeps
   * focus (a disabled button drops focus to <body>) and screen readers can
   * still reach it while the request is in flight.
   */
  loading?: boolean
  loadingLabel?: string
  icon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel,
  icon,
  fullWidth,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
      aria-disabled={loading || rest['aria-disabled'] || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  )
}
