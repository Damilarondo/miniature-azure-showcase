import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** A password (or secret) field with a show/hide toggle. The toggle is a
 *  real button (keyboard reachable, labelled) and never submits the form. */
export function PasswordInput({ wrapperClassName = '', className = 'input w-full', reveal = true, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string; reveal?: boolean }) {
  const [shown, setShown] = useState(false)
  if (!reveal) return <input {...props} className={className} />
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={shown ? 'text' : 'password'} className={`${className} pr-8`} />
      <button type="button" onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} title={shown ? 'Hide' : 'Show'}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-text-3 hover:text-text-1">
        {shown ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
      </button>
    </div>
  )
}
