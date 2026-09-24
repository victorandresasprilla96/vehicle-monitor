import { useEffect, useId, useRef, useState } from 'react'
import { initials } from '../../utils/initials'
import { Button } from '../Button/Button'
import styles from './UserMenu.module.css'

interface UserMenuProps {
  name: string
  email?: string
  onLogout: () => void
  loggingOut: boolean
}

/**
 * Account disclosure: avatar + name; opens a small panel with "Cerrar sesión".
 * Disclosure pattern (button + aria-expanded), not an ARIA menu: it holds a
 * single regular button. Esc closes it and returns focus; so do an outside
 * click and tabbing away.
 */
export function UserMenu({ name, email, onLogout, loggingOut }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        // Includes the visible name (WCAG 2.5.3 label-in-name)
        aria-label={`Cuenta de ${name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(name)}
        </span>
        <span className={styles.name}>{name}</span>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <p className={styles.identity}>
          <span className={styles.identityName}>{name}</span>
          {email && <span className={styles.identityEmail}>{email}</span>}
        </p>
        <Button
          variant="ghost"
          fullWidth
          className={styles.logout}
          onClick={onLogout}
          loading={loggingOut}
          loadingLabel="Saliendo…"
          icon={<LogoutIcon />}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3M13 13.5 16.5 10 13 6.5M16.5 10H8" />
    </svg>
  )
}
