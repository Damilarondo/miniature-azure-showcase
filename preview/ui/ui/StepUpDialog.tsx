import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useStepUpStore } from '../store/stepUpStore'
import { Dialog } from './Dialog'
import { PasswordInput } from './PasswordInput'

/** Asks for the password again before a high-risk action, showing exactly
 *  what is being confirmed ("what you see is what you confirm"). */
export function StepUpDialog() {
  const { pending, error, busy, submit, cancel } = useStepUpStore()
  const [password, setPassword] = useState('')
  if (!pending) return null

  const close = () => {
    setPassword('')
    cancel()
  }
  const go = async () => {
    if (!password) return
    await submit(password)
    setPassword('')
  }

  return (
    <Dialog title="Confirm with your password" onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={go} disabled={busy || !password}>
            {busy ? 'Checking…' : 'Confirm'}
          </button>
        </>
      }>
      <form onSubmit={(e) => { e.preventDefault(); void go() }} className="space-y-3">
        {pending.description && (
          <div className="rounded border border-border bg-surface-1 px-3 py-2 text-sm text-text-1">
            {pending.description}
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-text-2">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          {pending.purpose === 'trading'
            ? 'Unlocks Execute and Close for the next 10 minutes.'
            : 'Confirms this one change. You will be asked again for the next one.'}
        </p>
        <label className="block">
          <span className="label">Password</span>
          <PasswordInput wrapperClassName="mt-1" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} data-autofocus />
        </label>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </form>
    </Dialog>
  )
}
