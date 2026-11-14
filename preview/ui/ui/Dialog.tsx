import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

let open = 0
/** Shortcuts pause while any dialog is open. */
export function dialogsOpen(): boolean {
  return open > 0
}

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Danger dialogs get a danger-toned title bar. */
  tone?: 'default' | 'danger'
  width?: string
}

/** Modal: focus moves in, Tab stays in, Escape closes, focus returns. */
export function Dialog({ title, onClose, children, footer, tone = 'default', width = 'w-[440px]' }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    open += 1
    const previous = document.activeElement as HTMLElement | null
    const box = ref.current
    // The marked control first (e.g. the first reject reason), else the first field or button.
    const first = box?.querySelector<HTMLElement>('[data-autofocus]')
      ?? box?.querySelector<HTMLElement>('input, select, textarea, button')
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      } else if (e.key === 'Tab' && box) {
        const items = [...box.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
          .filter((el) => !el.hasAttribute('disabled'))
        if (!items.length) return
        const [firstEl, lastEl] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      open -= 1
      window.removeEventListener('keydown', onKey, true)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/70" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`${width} max-w-[95vw] rounded border border-border-strong bg-surface-2 shadow-none`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id={titleId} className={`text-base font-semibold ${tone === 'danger' ? 'text-danger' : 'text-text-1'}`}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog"><X size={14} /></button>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/** A yes/no confirmation in place of window.confirm. */
export function ConfirmDialog(props: {
  title: string
  body: ReactNode
  confirmLabel: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog title={props.title} onClose={props.onClose} tone={props.tone}
      footer={
        <>
          <button className="btn" onClick={props.onClose}>Cancel</button>
          <button className={`btn ${props.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} data-autofocus
            onClick={() => { props.onConfirm(); props.onClose() }}>
            {props.confirmLabel}
          </button>
        </>
      }>
      <div className="text-sm text-text-2">{props.body}</div>
    </Dialog>
  )
}
