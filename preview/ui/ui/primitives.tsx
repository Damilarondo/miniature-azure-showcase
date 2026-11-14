import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { signedPct, pct } from '../lib/format'
import { useFlash } from '../hooks/useFlash'

export type Tone = 'neutral' | 'up' | 'down' | 'warn' | 'review' | 'accent' | 'danger' | 'muted'

const BADGE: Record<Tone, string> = {
  neutral: 'border-border-strong bg-surface-3 text-text-1',
  muted: 'border-border bg-transparent text-text-3',
  up: 'border-up/50 bg-up/10 text-up',
  down: 'border-down/50 bg-down/10 text-down',
  warn: 'border-warn/50 bg-warn/10 text-warn',
  review: 'border-review/60 bg-review/10 text-review',
  accent: 'border-accent/60 bg-accent/10 text-accent',
  danger: 'border-danger/60 bg-danger/10 text-danger',
}

/** A labelled state: text first, colour second. */
export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title}
      className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 text-[11px] font-medium ${BADGE[tone]}`}>
      {children}
    </span>
  )
}

/** The call's side as coloured text with its arrow (no pill), as terminals show it. */
export function SideBadge({ side }: { side: string }) {
  const arrow = side === 'LONG' ? '▲' : side === 'SHORT' ? '▼' : '–'
  return (
    <span className={`num inline-flex w-[64px] items-center gap-1 text-[12px] font-medium ${
      side === 'LONG' ? 'text-up' : side === 'SHORT' ? 'text-down' : 'text-text-3'}`}>
      <span aria-hidden>{arrow}</span>
      {side === 'LONG' ? 'Long' : side === 'SHORT' ? 'Short' : side.charAt(0) + side.slice(1).toLowerCase()}
    </span>
  )
}

/** A signed move: sign, arrow and colour together (never colour alone). */
export function Delta({ value, digits = 2, flash = false, className = '' }: {
  value: number | null | undefined
  digits?: number
  flash?: boolean
  className?: string
}) {
  const tint = useFlash(flash ? value : null)
  if (value == null || !Number.isFinite(value)) return <span className={`num text-text-3 ${className}`}>—</span>
  const rounded = Number(value.toFixed(digits))
  const tone = rounded > 0 ? 'text-up' : rounded < 0 ? 'text-down' : 'text-text-2'
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus
  return (
    <span className={`num inline-flex items-center justify-end gap-0.5 rounded-sm px-0.5 ${tone} ${tint} ${className}`}>
      <Icon size={11} aria-hidden strokeWidth={2.5} />
      {signedPct(value, digits)}
    </span>
  )
}

/** Move against target as a bullet bar: one hue's shades for the bands
 *  (0–50%, 50–100% of target), the fill for the move, a tick at the target. */
export function BulletBar({ move, target, width = 120 }: {
  move: number | null | undefined
  target: number | null | undefined
  width?: number
}) {
  const t = Math.abs(target ?? 0)
  if (!t || move == null || !Number.isFinite(move)) {
    return <span className="text-text-3">—</span>
  }
  // Scale: −target .. +1.25 × target; zero sits at 44% from the left.
  const lo = -t
  const hi = t * 1.25
  const x = (v: number) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100
  const zero = x(0)
  const end = x(move)
  const share = move / t
  const label = `Move ${signedPct(move)} of target ${pct(t)} (${Math.round(share * 100)}%)`
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <svg width={width} height={12} role="img" aria-label={label} className="shrink-0">
        <rect x={`${zero}%`} y={2} width={`${x(t / 2) - zero}%`} height={8} className="fill-surface-3" />
        <rect x={`${x(t / 2)}%`} y={2} width={`${x(t) - x(t / 2)}%`} height={8} className="fill-border-strong" />
        <rect x={`${Math.min(zero, end)}%`} y={4} width={`${Math.abs(end - zero)}%`} height={4}
          className={move >= 0 ? 'fill-up' : 'fill-down'} />
        <rect x={`${x(t)}%`} y={0} width={2} height={12} className="fill-text-1" />
        <rect x={`${zero}%`} y={1} width={1} height={10} className="fill-text-3" />
      </svg>
      <span className="num w-9 text-right text-[11px] text-text-2">{Math.round(share * 100)}%</span>
    </span>
  )
}

const DOT: Record<'ok' | 'warn' | 'down' | 'idle', string> = {
  ok: 'bg-up', warn: 'bg-warn', down: 'bg-down', idle: 'bg-text-3',
}

/** A status with its age: "● Feed 12s". The dot never carries meaning alone. */
export function StatusDot({ state, label, detail, title }: {
  state: 'ok' | 'warn' | 'down' | 'idle'
  label: string
  detail?: string
  title?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs" title={title}>
      <span className={`h-2 w-2 rounded-full ${DOT[state]}`} aria-hidden />
      <span className="text-text-2">{label}</span>
      {detail && <span className={`num ${state === 'ok' || state === 'idle' ? 'text-text-1' : state === 'warn' ? 'text-warn' : 'text-down'}`}>{detail}</span>}
    </span>
  )
}

/** A zone of the screen: a title row and a body that scrolls on its own. */
export function Panel({ title, count, actions, children, className = '', bodyClassName = '' }: {
  title: ReactNode
  count?: number | string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`flex min-h-0 min-w-0 flex-col bg-surface-1 ${className}`}>
      <header className="flex h-9 shrink-0 items-center gap-2 px-3">
        <h2 className="text-[13px] font-semibold text-accent">{title}</h2>
        {count !== undefined && <span className="num text-[12px] text-text-3">{count}</span>}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName || 'overflow-auto'}`}>{children}</div>
    </section>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-border-strong bg-surface-3 px-1 font-mono text-[11px] text-text-1">
      {children}
    </kbd>
  )
}

export function EmptyState({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-1 px-4 py-6 text-center">
      <p className="text-sm text-text-2">{title}</p>
      {detail && <p className="text-xs text-text-3">{detail}</p>}
    </div>
  )
}
