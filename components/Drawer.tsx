'use client'

/**
 * Accessible slide-out drawer (modal dialog) for the detail panels.
 *
 * Open:   role="dialog" + aria-modal, labelled by its heading; focus moves to
 *         the heading; Tab / Shift+Tab stay inside; Escape or the backdrop
 *         closes; the rest of the page is inert and does not scroll.
 * Close:  focus returns to the control that opened it. The closed drawer stays
 *         mounted (so it can slide out) but is `inert`, so nothing inside it can
 *         be focused or read by assistive tech.
 *
 * Rendered into document.body so that making "everything else" inert is a
 * simple loop over body's children.
 */
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// True on the client after hydration, false during server rendering
const subscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)

interface DrawerProps {
  open: boolean
  onClose: () => void
  /** Accessible name, also shown to screen readers as the dialog heading */
  title: string
  /** Panel class (sets size and slide direction), e.g. "detail-panel" */
  className: string
  children: ReactNode
}

export default function Drawer({ open, onClose, title, className, children }: DrawerProps) {
  const isClient = useIsClient()
  const panelRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const headingId = useId()

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Make everything outside the drawer inert, and stop the page scrolling
    const host = panel.parentElement
    const others = [...document.body.children].filter((el) => el !== host && !el.hasAttribute('inert')) as HTMLElement[]
    others.forEach((el) => el.setAttribute('inert', ''))
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    headingRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!items.length) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === headingRef.current || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      others.forEach((el) => el.removeAttribute('inert'))
      document.body.style.overflow = overflow
      // Return focus to the opener, if it is still on the page
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
    }
  }, [open, onClose])

  if (!isClient) return null

  return createPortal(
    <div className="drawer-host">
      <div className={`overlay${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`${className}${open ? ' open' : ''}`}
        // A dialog only while open; closed, it is inert and out of the accessibility tree
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-labelledby={open ? headingId : undefined}
        aria-hidden={open ? undefined : true}
        inert={!open}
      >
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="sr-only">{title}</h2>
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </aside>
    </div>,
    document.body,
  )
}
