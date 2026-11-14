import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api, qs } from '../lib/api'
import { age, clock, horizonShort, pct, toMs, utc, DASH } from '../lib/format'
import { useAlertStore, isDirectional, type Alert } from '../store/alertStore'
import { useNow } from '../hooks/useNow'
import { FOCUS_SEARCH } from '../hooks/useShortcuts'
import { dialogsOpen } from '../ui/Dialog'
import { DataTable, type Column } from '../ui/DataTable'
import { Badge, Delta, EmptyState, Panel, SideBadge } from '../ui/primitives'
import { AlertDetail } from '../components/alerts/AlertDetail'
import { ConfidenceCell, StatusBadge, TickerCell } from '../components/alerts/cells'
import { reviewKey } from '../components/alerts/review'
import { usePanelRef } from 'react-resizable-panels'
import { Handle, Pane, Split } from '../ui/Resizable'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { AlertList } from '../components/alerts/AlertList'

const STATUS_OPTIONS = [
  ['', 'Any status'], ['review', 'Awaiting review'], ['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['REJECTED', 'Rejected'],
] as const
const SIGNAL_OPTIONS = [['', 'Any side'], ['LONG', 'Long'], ['SHORT', 'Short'], ['NEUTRAL', 'Neutral']] as const
const OUTCOME_OPTIONS = [['', 'Any outcome'], ['OPEN', 'Open'], ['REVISED', 'Revised'], ['CLOSED', 'Closed']] as const

/** Every alert: server-side filters and paging, the same detail panel. */
export function AlertsView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const live = useAlertStore((s) => s.byId)
  const now = useNow(15000)
  const search = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<Alert[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState(params.get('q') ?? '')

  const status = params.get('status') ?? ''
  const signal = params.get('signal') ?? ''
  const outcome = params.get('outcome') ?? ''
  const since = params.get('since') ?? ''
  const until = params.get('until') ?? ''
  const query = params.get('q') ?? ''

  const filters = useMemo(() => ({
    status: status === 'review' ? 'PENDING' : status,
    review: status === 'review',
    signal, outcome,
    since: since ? new Date(`${since}T00:00:00`).toISOString() : '',
    until: until ? new Date(`${until}T23:59:59`).toISOString() : '',
    q: query,
  }), [status, signal, outcome, since, until, query])

  const load = useCallback(async (after: string | null) => {
    setLoading(true)
    try {
      const r = await api<{ alerts: Alert[]; next_cursor: string | null }>(
        `/api/alerts${qs({ ...filters, limit: 100, cursor: after })}`)
      setRows((prev) => (after ? [...prev, ...r.alerts] : r.alerts))
      setCursor(r.next_cursor)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load(null)
  }, [load])

  // Debounced search box -> URL.
  useEffect(() => {
    if (q === query) return
    const t = setTimeout(() => setParam('q', q), 300)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // "/" focuses the search box.
  useEffect(() => {
    const focus = () => search.current?.focus()
    window.addEventListener(FOCUS_SEARCH, focus)
    if ((location.state as { focusSearch?: boolean } | null)?.focusSearch) focus()
    return () => window.removeEventListener(FOCUS_SEARCH, focus)
  }, [location.state])

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && id && !dialogsOpen() && document.activeElement !== search.current) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const open = (a: Alert) => navigate({ pathname: `/alerts/${encodeURIComponent(a.alert_id)}`, search: params.toString() })
  const close = () => navigate({ pathname: '/alerts', search: params.toString() })

  // Live values from the WebSocket replace the fetched ones.
  const merged = rows.map((r) => (live[r.alert_id] ? { ...r, ...live[r.alert_id] } : r))

  const columns: Column<Alert>[] = [
    { key: 'time', header: 'Published', width: '112px', cell: (a) => <span className="num text-text-2" title={utc(a.timestamp)}>{clock(a.timestamp, now)}</span>, sortValue: (a) => toMs(a.timestamp) },
    { key: 'ticker', header: 'Ticker', width: '120px', cell: (a) => <TickerCell alert={a} />, sortValue: (a) => a.instruments?.[0] },
    { key: 'side', header: 'Side', width: '84px', cell: (a) => <SideBadge side={a.signal} />, sortValue: (a) => a.signal },
    { key: 'conf', header: 'Conf', width: '60px', align: 'right', cell: (a) => <ConfidenceCell alert={a} />, sortValue: (a) => a.confidence },
    { key: 'status', header: 'Status', width: '104px', priority: 2, cell: (a) => <StatusBadge alert={a} />, sortValue: (a) => a.status },
    { key: 'outcome', header: 'Outcome', width: '92px', priority: 3, cell: (a) => (isDirectional(a) && a.outcome
      ? <Badge tone={a.outcome === 'CLOSED' ? 'muted' : a.outcome === 'REVISED' ? 'accent' : 'neutral'}>{a.outcome}</Badge> : <span className="text-text-3">{DASH}</span>) },
    { key: 'move', header: 'Move %', width: '92px', priority: 2, align: 'right', cell: (a) => <Delta value={a.move_pct} />, sortValue: (a) => a.move_pct },
    { key: 'target', header: 'Target %', width: '76px', priority: 4, align: 'right', cell: (a) => (isDirectional(a) && a.expected_return_pct ? pct(Math.abs(a.expected_return_pct)) : DASH) },
    { key: 'horizon', header: 'Horizon', width: '132px', priority: 5, cell: (a) => <span className="text-text-2">{horizonShort(a.impact_horizon)}</span> },
    { key: 'event', header: 'Event', cell: (a) => <span className="text-text-2" title={a.event || a.event_summary}>{a.event || a.event_summary}</span> },
  ]

  const detailPanel = usePanelRef()
  const wide = useMediaQuery('(min-width: 1100px)')
  const phone = !useMediaQuery('(min-width: 768px)')
  useEffect(() => {
    const panel = detailPanel.current
    if (!panel) return
    if (id && panel.isCollapsed()) panel.expand()
    if (!id && !panel.isCollapsed()) panel.collapse()
  }, [id, detailPanel])

  const list = (
      <Panel
        className="h-full"
        title="Alerts"
        count={`${merged.length}${cursor ? '+' : ''}`}
        actions={loading ? <span className="text-[11px] text-text-3">Loading…</span> : null}
        bodyClassName="flex flex-col overflow-hidden"
      >
        <form role="search" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2" onSubmit={(e) => e.preventDefault()}>
          <label className="relative w-full sm:w-auto">
            <span className="sr-only">Search ticker or event</span>
            <Search size={14} className="pointer-events-none absolute left-2 top-2 text-text-3" aria-hidden />
            <input ref={search} className="input w-full pl-7 sm:w-64" placeholder="Ticker or event  ( / )" value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget.blur(), e.stopPropagation())} />
          </label>
          <select className="input" aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}>
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" aria-label="Side" value={signal} onChange={(e) => setParam('signal', e.target.value)}>
            {SIGNAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" aria-label="Outcome" value={outcome} onChange={(e) => setParam('outcome', e.target.value)}>
            {OUTCOME_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="hidden items-center gap-1 text-xs text-text-3 sm:flex">From
            <input type="date" className="input" value={since} onChange={(e) => setParam('since', e.target.value)} />
          </label>
          <label className="hidden items-center gap-1 text-xs text-text-3 sm:flex">To
            <input type="date" className="input" value={until} onChange={(e) => setParam('until', e.target.value)} />
          </label>
          {(status || signal || outcome || since || until || query) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setParams(new URLSearchParams(), { replace: true }) }}>
              Clear filters
            </button>
          )}
          {error && <span role="alert" className="text-xs text-danger">{error}</span>}
        </form>
        <div className="min-h-0 flex-1 overflow-auto">
          {phone ? (
            <AlertList mode="history" rows={merged} now={now} selectedKey={id ?? null} onSelect={open}
              empty={<EmptyState title={loading ? 'Loading…' : 'No alerts match'} detail={loading ? undefined : 'Change or clear the filters.'} />} />
          ) : (
            <DataTable label="Alerts" rows={merged} columns={columns} rowKey={(a) => a.alert_id} selectedKey={id ?? null}
              onSelect={open} onRowKey={reviewKey}
              empty={<EmptyState title={loading ? 'Loading…' : 'No alerts match'} detail={loading ? undefined : 'Change or clear the filters.'} />} />
          )}
          {cursor && (
            <div className="flex justify-center py-3">
              <button className="btn" disabled={loading} onClick={() => void load(cursor)}>Load 100 more</button>
            </div>
          )}
          {!cursor && merged.length > 0 && (
            <p className="py-3 text-center text-[11px] text-text-3">End of results · oldest {age(merged[merged.length - 1].timestamp, now)} ago</p>
          )}
        </div>
      </Panel>
  )

  if (!wide) {
    // Tablets: the detail slides over the list; phones: it fills the screen.
    return (
      <div className="relative h-full bg-surface-0">
        {list}
        {id && (
          <div className={phone ? 'fixed inset-0 z-40 bg-surface-1'
            : 'absolute inset-y-0 right-0 z-20 w-full max-w-[460px] border-l border-border bg-surface-1 shadow-2xl'}>
            <AlertDetail alertId={id} onClose={close} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-surface-0">
     <Split id="alerts-columns" orientation="horizontal">
     <Pane id="list" defaultSize="68" minSize="35">
      {list}
     </Pane>
     <Handle orientation="horizontal" />
     <Pane id="detail" panelRef={detailPanel} defaultSize="32" minSize="18" collapsible collapsedSize="0" className="bg-surface-1">
       {id && <AlertDetail alertId={id} onClose={close} />}
     </Pane>
     </Split>
    </div>
  )
}
