import { useCallback, useEffect, useState } from 'react'
import { api, qs } from '../lib/api'
import { age, clock, timeLeft, utc } from '../lib/format'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import { useNow } from '../hooks/useNow'
import { ConfirmDialog } from '../ui/Dialog'
import { DataTable, type Column } from '../ui/DataTable'
import { Badge, EmptyState, Panel } from '../ui/primitives'
import { PasswordInput } from '../ui/PasswordInput'

interface SessionRow {
  id: string
  created_at: string
  last_seen_at: string
  ip: string | null
  user_agent: string | null
  current: boolean
}

interface AuditEntry {
  id: number | string
  at: string
  actor: string | null
  action: string
  target: string | null
  result: string
  ip: string | null
  detail: unknown
}

const MIN_LEN = 15
const MAX_LEN = 128

function PasswordPanel() {
  const expire = useAuthStore((s) => s.expire)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const problem =
    next && next.length < MIN_LEN ? `At least ${MIN_LEN} characters (${next.length} so far).`
      : next.length > MAX_LEN ? `At most ${MAX_LEN} characters.`
        : again && next !== again ? 'The two new passwords differ.'
          : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!current || !next || problem || next !== again) return
    setBusy(true)
    setError(null)
    try {
      await api('/api/auth/password', { method: 'POST', body: { current_password: current, new_password: next } })
      toast('Password changed. Every session was signed out.', 'success')
      expire('Password changed. Sign in with the new password.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
      setCurrent('')
    }
  }

  return (
    <Panel title="Change password" bodyClassName="p-3">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="label">Current password</span>
          <PasswordInput wrapperClassName="mt-1" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">New password</span>
          <PasswordInput wrapperClassName="mt-1" autoComplete="new-password" value={next} maxLength={MAX_LEN}
            onChange={(e) => setNext(e.target.value)} aria-describedby="pw-rules" />
        </label>
        <label className="block">
          <span className="label">New password again</span>
          <PasswordInput wrapperClassName="mt-1" autoComplete="new-password" value={again} maxLength={MAX_LEN}
            onChange={(e) => setAgain(e.target.value)} />
        </label>
        <p id="pw-rules" className="text-xs text-text-3">
          {MIN_LEN}–{MAX_LEN} characters. A long passphrase is best; no symbol rules. Passwords found in known breaches are refused.
        </p>
        {(problem || error) && <p role="alert" className="text-xs text-danger">{problem ?? error}</p>}
        <button className="btn btn-primary" disabled={busy || !current || !next || !again || !!problem}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
        <p className="text-xs text-text-3">Changing it signs out every session, this one included.</p>
      </form>
    </Panel>
  )
}

function SessionInfo() {
  const session = useAuthStore((s) => s.session)
  const now = useNow(1000)
  if (!session) return null
  const trading = session.trading_until && Date.parse(session.trading_until) > now
  return (
    <Panel title="This session" bodyClassName="p-3">
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-text-3">Signed in as</dt><dd className="text-text-1">{session.user.username} <span className="text-text-3">({session.user.role})</span></dd>
        <dt className="text-text-3">Idle sign-out in</dt><dd className="num text-text-1">{timeLeft(session.idle_expires_at, now)}</dd>
        <dt className="text-text-3">Ends at the latest</dt><dd className="num text-text-1" title={utc(session.absolute_expires_at)}>{clock(session.absolute_expires_at, now)}</dd>
        <dt className="text-text-3">Trading unlocked</dt>
        <dd>{trading ? <Badge tone="warn">for {timeLeft(session.trading_until, now)}</Badge> : <span className="text-text-2">No</span>}</dd>
      </dl>
    </Panel>
  )
}

function SessionsPanel() {
  const [rows, setRows] = useState<SessionRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const now = useNow(30000)

  const load = useCallback(async () => {
    try {
      setRows((await api<{ sessions: SessionRow[] }>('/api/auth/sessions')).sessions)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (id: string) => {
    try {
      await api(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      toast('Session signed out', 'success')
      await load()
    } catch (e) {
      toast(`Not signed out: ${(e as Error).message}`, 'error')
    }
  }
  const revokeOthers = async () => {
    try {
      await api('/api/auth/sessions', { method: 'DELETE' })
      toast('Every other session was signed out', 'success')
      await load()
    } catch (e) {
      toast(`Not signed out: ${(e as Error).message}`, 'error')
    }
  }

  const columns: Column<SessionRow>[] = [
    { key: 'device', header: 'Device', cell: (s) => <span className="text-text-2" title={s.user_agent ?? ''}>{s.user_agent ?? '—'}</span> },
    { key: 'ip', header: 'IP', width: '140px', cell: (s) => <span className="num">{s.ip ?? '—'}</span> },
    { key: 'created', header: 'Signed in', width: '112px', cell: (s) => <span title={utc(s.created_at)}>{clock(s.created_at, now)}</span> },
    { key: 'seen', header: 'Last active', width: '96px', align: 'right', cell: (s) => `${age(s.last_seen_at, now)} ago` },
    { key: 'act', header: <span className="sr-only">Actions</span>, width: '120px', align: 'right', cell: (s) =>
      s.current ? <Badge tone="accent">This one</Badge> : <button className="btn btn-sm btn-danger" onClick={() => void revoke(s.id)}>Sign out</button> },
  ]

  return (
    <Panel title="Active sessions" count={rows.length}
      actions={rows.length > 1 && <button className="btn btn-sm" onClick={() => setConfirmAll(true)}>Sign out all others</button>}>
      {error && <p role="alert" className="px-3 py-2 text-xs text-danger">{error}</p>}
      <DataTable label="Active sessions" rows={rows} columns={columns} rowKey={(s) => s.id} empty={<EmptyState title="No sessions" />} />
      {confirmAll && (
        <ConfirmDialog title="Sign out every other session" tone="danger" confirmLabel="Sign them out"
          body="Every browser except this one is signed out at once." onConfirm={() => void revokeOthers()} onClose={() => setConfirmAll(false)} />
      )}
    </Panel>
  )
}

function AuditPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [chainOk, setChainOk] = useState<boolean | null>(null)
  const [action, setAction] = useState('')
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = useNow(30000)

  const load = useCallback(async (before?: string | number) => {
    setLoading(true)
    try {
      const r = await api<{ entries: AuditEntry[]; chain_ok: boolean }>(`/api/audit${qs({ limit: 100, before, action })}`)
      setEntries((prev) => (before ? [...prev, ...r.entries] : r.entries))
      setChainOk(r.chain_ok)
      setMore(r.entries.length === 100)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [action])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const columns: Column<AuditEntry>[] = [
    { key: 'at', header: 'Time (UTC)', width: '172px', cell: (e) => <span className="num text-text-2" title={`${age(e.at, now)} ago`}>{utc(e.at).replace(' UTC', '')}</span> },
    { key: 'actor', header: 'Who', width: '112px', cell: (e) => e.actor ?? '—' },
    { key: 'action', header: 'Action', width: '200px', cell: (e) => <span className="font-mono text-[12px] text-text-1">{e.action}</span> },
    { key: 'result', header: 'Result', width: '96px', cell: (e) => (
      <Badge tone={/^(ok|success|allowed)$/i.test(e.result) ? 'muted' : 'danger'}>{e.result}</Badge>
    ) },
    { key: 'target', header: 'Target', width: '180px', cell: (e) => <span className="text-text-2" title={e.target ?? ''}>{e.target ?? '—'}</span> },
    { key: 'ip', header: 'IP', width: '128px', cell: (e) => <span className="num text-text-3">{e.ip ?? '—'}</span> },
    { key: 'detail', header: 'Detail', cell: (e) => {
      const text = e.detail == null ? '' : typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)
      return <span className="font-mono text-[11px] text-text-3" title={text}>{text}</span>
    } },
  ]

  return (
    <Panel title="Audit log" count={entries.length}
      actions={
        <>
          {chainOk === true && <Badge tone="muted" title="Every entry's hash links to the one before it">Chain intact</Badge>}
          {chainOk === false && <Badge tone="danger" title="An entry was changed or removed">Chain broken</Badge>}
          <input className="input h-6 w-48 text-[12px]" placeholder="Filter action (e.g. auth.)" value={action}
            aria-label="Filter by action prefix" onChange={(e) => setAction(e.target.value)} />
        </>
      }>
      {error && <p role="alert" className="px-3 py-2 text-xs text-danger">{error}</p>}
      <DataTable label="Audit log" rows={entries} columns={columns} rowKey={(e) => String(e.id)} density="compact"
        empty={<EmptyState title={loading ? 'Loading…' : 'No entries'} />} />
      {more && entries.length > 0 && (
        <div className="flex justify-center py-2">
          <button className="btn btn-sm" disabled={loading} onClick={() => void load(entries[entries.length - 1].id)}>Older entries</button>
        </div>
      )}
    </Panel>
  )
}

/** Password, sessions and the audit trail. */
export function SecurityView() {
  return (
    // Wide: two columns that fit the screen; narrower: one column that scrolls,
    // each table given a usable height.
    <div className="flex h-full flex-col gap-2 overflow-auto p-2 lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:overflow-hidden">
      <div className="flex flex-col gap-2 lg:min-h-0 lg:overflow-auto">
        <SessionInfo />
        <PasswordPanel />
      </div>
      <div className="flex flex-col gap-2 [&>*]:min-h-[300px] lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:[&>*]:min-h-0">
        <SessionsPanel />
        <AuditPanel />
      </div>
    </div>
  )
}
