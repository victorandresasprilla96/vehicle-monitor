import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Device } from '../../api/types'
import { STATUS_LABEL } from '../../utils/status'
import { matchesQuery } from '../../utils/search'
import { PulseIndicator } from '../PulseIndicator/PulseIndicator'
import styles from './VehicleCombobox.module.css'

interface VehicleComboboxProps {
  devices: Device[]
  selectedId: number | null
  onChange: (id: number) => void
}

/**
 * Searchable vehicle picker for large fleets, following the WAI-ARIA APG
 * "editable combobox with list autocomplete" pattern:
 * - focus stays in the input; the active option is conveyed with aria-activedescendant
 * - ↓/↑ open and move, Enter selects, Esc closes, Tab leaves
 * - the result count is announced politely as the operator types
 * Accent- and case-insensitive: "camion 02" finds "Camión 02".
 */
export function VehicleCombobox({ devices, selectedId, onChange }: VehicleComboboxProps) {
  const inputId = useId()
  const listboxId = useId()
  const hintId = useId()
  const optionId = (id: number) => `${listboxId}-opt-${id}`
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = devices.find((d) => d.id === selectedId) ?? null
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const filter = (q: string) => (q ? devices.filter((d) => matchesQuery(d.name, q)) : devices)
  const results = useMemo(
    () => (query ? devices.filter((d) => matchesQuery(d.name, query)) : devices),
    [devices, query],
  )
  const active = activeIndex >= 0 ? results[activeIndex] : undefined
  const online = devices.filter((d) => d.status === 'online').length

  // Keep the active option visible while moving with the keyboard
  const activeOptionId = open && active ? optionId(active.id) : null
  useEffect(() => {
    if (activeOptionId)
      document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' })
  }, [activeOptionId])

  function openList(index?: number) {
    setOpen(true)
    const current = results.findIndex((d) => d.id === selectedId)
    setActiveIndex(index ?? (current >= 0 ? current : results.length ? 0 : -1))
  }

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  function choose(device: Device) {
    onChange(device.id)
    close()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openList()
        else setActiveIndex((i) => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList(results.length - 1)
        else setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (open && active) {
          event.preventDefault()
          choose(active)
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          close()
        }
        break
      case 'Tab':
        if (open) close()
        break
    }
  }

  const expanded = open && results.length > 0

  return (
    <div className={styles.combobox}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          Vehículo
        </label>
        <span id={hintId} className={styles.hint}>
          {online} de {devices.length} en línea
        </span>
      </div>

      <div className={styles.field}>
        {selected && !open && (
          <span className={styles.leading} aria-hidden="true">
            <PulseIndicator status={selected.status} />
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          className={styles.input}
          data-has-leading={(selected && !open) || undefined}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded && activeOptionId ? activeOptionId : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={open ? 'Buscar por nombre…' : 'Selecciona un vehículo'}
          value={open ? query : (selected?.name ?? '')}
          // Keyboard users tab in and just type: select the shown name so typing replaces it
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            let next = e.target.value
            // Typed without the list open (e.g. caret moved): drop the displayed name
            if (!open && selected && next.startsWith(selected.name))
              next = next.slice(selected.name.length)
            setQuery(next)
            setOpen(true)
            // First match of the *new* query becomes active (Enter picks it)
            setActiveIndex(filter(next).length ? 0 : -1)
          }}
          onKeyDown={onKeyDown}
          onClick={() => (open ? close() : openList())}
          onBlur={close}
        />
        <span className={styles.chevron} aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16">
            <path
              d="m4 6 4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* Always in the DOM so aria-controls points at a real element.
            Neutral <div>s (not ul/li) so no extra "list" semantics get announced.
            Keyboard lives on the input (aria-activedescendant), per the APG pattern. */}
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label="Vehículos"
          className={styles.listbox}
          hidden={!expanded}
          // Keep focus in the input when clicking an option
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((device, index) => (
            // Keyboard is handled by the input via aria-activedescendant (APG pattern):
            // options are never focused, so they need no key handlers of their own.
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={device.id}
              id={optionId(device.id)}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              className={styles.option}
              data-current={device.id === selectedId || undefined}
              onClick={() => choose(device)}
              onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
            >
              <PulseIndicator status={device.status} />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{device.name}</span>
                <span className={styles.optionStatus} data-status={device.status}>
                  {STATUS_LABEL[device.status]}
                </span>
              </span>
              {device.id === selectedId && (
                <svg
                  className={styles.check}
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="m3.5 8.5 3 3 6-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        {open && results.length === 0 && (
          <p className={styles.empty}>Ningún vehículo coincide con «{query}».</p>
        )}
      </div>

      {/* Result count for screen readers, only while searching */}
      <p className="sr-only" role="status">
        {open && query
          ? results.length === 1
            ? '1 vehículo encontrado'
            : `${results.length} vehículos encontrados`
          : ''}
      </p>
    </div>
  )
}
