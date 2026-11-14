import { X } from 'lucide-react'
import { useToastStore } from '../store/toastStore'

const TONE = {
  info: 'border-border-strong',
  success: 'border-up/60',
  error: 'border-danger/70',
}

/** Bottom-right notices; the undo toast keeps its button until it commits. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[360px] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-center gap-3 rounded border ${TONE[t.tone]} bg-surface-3 px-3 py-2 text-sm text-text-1`}>
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button className="btn btn-sm btn-primary" onClick={t.action.run}>{t.action.label}</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      ))}
    </div>
  )
}
