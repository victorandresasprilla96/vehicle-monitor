import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  id: string
  label: string
  children: ReactNode
  /**
   * false → renders as a plain side panel (same element tree), so switching
   * layout (e.g. rotating the phone) never remounts the panel or drops focus.
   */
  enabled?: boolean
  className?: string
  hidden?: boolean
  /** Reports how many px of the map the sheet covers (for map controls/camera) */
  onInsetChange?: (px: number) => void
}

const MIN_PEEK = 96
/** Collapsed, the sheet never covers more than this share of the map area */
const MAX_PEEK_RATIO = 0.5
const PEEK_GAP = 12
const DRAG_THRESHOLD = 6
const FLICK_VELOCITY = 0.35 // px/ms

/**
 * Mobile bottom sheet over the map.
 * - Collapsed it "peeks" down to the element marked [data-sheet-peek] (the
 *   speed row): vehicle, status and speed are visible without touching anything.
 * - The handle is a real button (aria-expanded): tap / Enter / Space toggle it.
 *   Dragging is an enhancement, never the only way (WCAG 2.5.1).
 * - Content is never hidden from assistive tech (so live announcements keep
 *   working); if keyboard focus lands in the covered part, the sheet expands.
 * - Esc collapses it and returns focus to the handle.
 */
export function BottomSheet({
  id,
  label,
  children,
  onInsetChange,
  enabled = true,
  className,
  hidden,
}: BottomSheetProps) {
  const bodyId = useId()
  const sheetRef = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [expanded, setExpanded] = useState(false)
  const [metrics, setMetrics] = useState({ height: 0, peek: 0 })
  const [drag, setDrag] = useState<{ offset: number } | null>(null)
  const gesture = useRef<{ y: number; t: number; start: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const maxOffset = Math.max(0, metrics.height - metrics.peek)
  const offset = !enabled ? 0 : drag ? drag.offset : expanded ? 0 : maxOffset

  // Measure sheet height and the peek line; re-measure whenever content changes.
  const measure = useCallback(() => {
    if (!enabled) return
    const sheet = sheetRef.current
    const body = bodyRef.current
    const handle = handleRef.current
    if (!sheet || !body || !handle) return
    const height = sheet.offsetHeight
    const boundary = body.querySelector<HTMLElement>('[data-sheet-peek]')
    const peekLine = boundary
      ? boundary.getBoundingClientRect().bottom - body.getBoundingClientRect().top + body.scrollTop
      : body.scrollHeight * 0.45
    // Cap the peek so the map stays usable with large text on small phones
    const available = sheet.parentElement?.clientHeight ?? height
    const wanted = Math.max(MIN_PEEK, handle.offsetHeight + peekLine + PEEK_GAP)
    const peek = Math.min(height, wanted, Math.max(MIN_PEEK, available * MAX_PEEK_RATIO))
    setMetrics((m) => (m.height === height && m.peek === peek ? m : { height, peek }))
  }, [enabled])

  useLayoutEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (sheetRef.current) observer.observe(sheetRef.current)
    if (bodyRef.current) observer.observe(bodyRef.current)
    const mutations = new MutationObserver(measure)
    if (bodyRef.current) mutations.observe(bodyRef.current, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [measure])

  // Covered map area = visible part of the sheet
  const visible = Math.round(metrics.height - offset)
  useEffect(() => {
    onInsetChange?.(!enabled ? 0 : drag ? metrics.peek : visible)
  }, [enabled, visible, drag, metrics.peek, onInsetChange])

  useEffect(() => () => onInsetChange?.(0), [onInsetChange])

  // Collapsed body always shows its top (the peek)
  useEffect(() => {
    if (!expanded && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [expanded])

  // ---- drag on the handle (enhancement) ----
  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    gesture.current = { y: e.clientY, t: performance.now(), start: offset, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current
    if (!g) return
    const dy = e.clientY - g.y
    if (!g.moved && Math.abs(dy) < DRAG_THRESHOLD) return
    g.moved = true
    setDrag({ offset: Math.min(maxOffset, Math.max(0, g.start + dy)) })
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current
    gesture.current = null
    if (!g?.moved) return
    suppressClick.current = true // this was a drag, not a tap
    const dy = e.clientY - g.y
    const velocity = dy / Math.max(1, performance.now() - g.t)
    const current = Math.min(maxOffset, Math.max(0, g.start + dy))
    setExpanded(
      velocity < -FLICK_VELOCITY
        ? true
        : velocity > FLICK_VELOCITY
          ? false
          : current < maxOffset / 2,
    )
    setDrag(null)
  }

  function onHandleClick() {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setExpanded((x) => !x)
  }

  // Esc from anywhere inside the expanded sheet collapses it (delegated listener)
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !expanded) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setExpanded(false)
      handleRef.current?.focus()
    }
    sheet.addEventListener('keydown', onKeyDown)
    return () => sheet.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  // Keyboard focus inside the covered part → reveal it
  function onFocusCapture(e: FocusEvent<HTMLElement>) {
    if (!enabled || expanded || e.target === handleRef.current) return
    const target = e.target as HTMLElement
    const sheetTop = sheetRef.current?.getBoundingClientRect().top ?? 0
    const visibleBottom = sheetTop + metrics.peek
    if (target === sheetRef.current || target.getBoundingClientRect().bottom > visibleBottom) {
      setExpanded(true)
    }
  }

  return (
    <aside
      ref={sheetRef}
      id={id}
      aria-label={label}
      tabIndex={-1}
      className={enabled ? styles.sheet : className}
      hidden={hidden}
      data-expanded={(enabled && expanded) || undefined}
      data-dragging={drag ? true : undefined}
      // Collapsed position is relative to the sheet's own height (100%), not a
      // measured pixel height: when content grows (data arrives) the browser
      // re-resolves it in the same frame — a stale px offset made the sheet jump.
      style={
        !enabled
          ? undefined
          : {
              transform: drag
                ? `translateY(${drag.offset}px)`
                : expanded
                  ? 'translateY(0)'
                  : `translateY(calc(100% - ${metrics.peek}px))`,
            }
      }
      onFocusCapture={onFocusCapture}
    >
      {/* Handle only as a sheet; `false` keeps the slot so the body never remounts */}
      {enabled && (
        <button
          ref={handleRef}
          type="button"
          className={styles.handle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onHandleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            gesture.current = null
            setDrag(null)
          }}
        >
          <span className={styles.grip} aria-hidden="true" />
          <span className={styles.handleLabel}>Detalles del vehículo</span>
          <svg
            className={styles.chevron}
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="m4 10 4-4 4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div ref={bodyRef} id={bodyId} className={enabled ? styles.body : styles.panelBody}>
        {children}
      </div>
    </aside>
  )
}
