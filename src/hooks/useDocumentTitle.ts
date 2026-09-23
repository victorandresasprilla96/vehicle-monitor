import { useEffect } from 'react'

export const APP_NAME = 'Monitor de flota'

/**
 * Page title that says what's on screen ("Camión 01 · En línea — Monitor de flota"):
 * distinguishes tabs in a control room and is the first thing a screen reader
 * announces when the operator switches to this tab.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME
  }, [title])
}
