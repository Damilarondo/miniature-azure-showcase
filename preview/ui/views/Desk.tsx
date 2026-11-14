import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePanelRef } from 'react-resizable-panels'
import { Link } from 'react-router-dom'
import { useAlertStore, byTimeDesc, isLive, needsReview, type Alert } from '../store/alertStore'
import { useExecutionStore, type Row } from '../store/executionStore'
import { useSummaryStore } from '../store/summaryStore'
import { useNow } from '../hooks/useNow'
import { dialogsOpen } from '../ui/Dialog'
import { age, clock, horizonShort, num, pct, price, prob, toMs, utc, DASH } from '../lib/format'
import { DataTable, type Column } from '../ui/DataTable'
import { Badge, BulletBar, Delta, EmptyState, Panel, SideBadge } from '../ui/primitives'
import { AlertDetail } from '../components/alerts/AlertDetail'
import { ConfidenceCell, LiveStateBadge, TickerCell, horizonLeft, liveState } from '../components/alerts/cells'
import { ReviewBulkActions, ReviewButtons, reviewKey } from '../components/alerts/review'
import { Handle, Pane, Split } from '../ui/Resizable'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { AlertList } from '../components/alerts/AlertList'

function Kpi({ label, value, context, tone = 'text-text-1' }: { label: string; value: ReactNode; context?: ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center bg-surface-1 px-3 py-1.5">
      <span className="label">{label}</span>
      <span className={`num text-lg font-semibold leading-6 ${tone}`}>{value}</span>
      <span className="truncate text-[11px] text-text-3">{context ?? ' '}</span>
    </div>
  )
}

/** Home: exceptions first. Review queue top-left, live calls below, the
 *  engine at the bottom, details on the right. One screen, no page scroll. */
export function DeskView() {
  const byId = useAlertStore((s) => s.byId)
  const loaded = useAlertStore((s) => s.loaded)
  const error = useAlertStore((s) => s.error)
  const summary = useSummaryStore((s) => s.summary)
  const threshold = useSummaryStore((s) => s.threshold)
  const { positions, events, globalKill, offline } = useExecutionStore()
  const now = useNow(5000)
  const [selected, setSelected] = useState<string | null>(null)
  const wide = useMediaQuery('(min-width: 1100px)')
  const phone = !useMediaQuery('(min-width: 768px)')
  const [tab, setTab] = useState<'review' | 'live' | 'engine'>('live')
  const detailPanel = usePanelRef()
  // The detail pane takes no room until a call is selected.
  useEffect(() => {
    const panel = detailPanel.current
    if (!panel) return
    if (selected && panel.isCollapsed()) panel.expand()
    if (!selected && !panel.isCollapsed()) panel.collapse()
  }, [selected, wide, detailPanel])

  const all = useMemo(() => Object.values(byId), [byId])
  const review = useMemo(() => all.filter(needsReview).sort(byTimeDesc), [all])
  const live = useMemo(() => all.filter((a) => isLive(a) && a.status !== 'PENDING').sort(byTimeDesc), [all])
  const stale = live.filter((a) => liveState(a, now).label === 'Stale').length

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialogsOpen()) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reviewCols: Column<Alert>[] = [
    { key: 'time', header: 'Time', width: '64px', priority: 3, cell: (a) => <span className="num text-text-2" title={utc(a.timestamp)}>{clock(a.timestamp, now)}</span>, sortValue: (a) => toMs(a.timestamp) },
    { key: 'ticker', header: 'Ticker', width: '112px', cell: (a) => <TickerCell alert={a} />, sortValue: (a) => a.instruments?.[0] },
    { key: 'side', header: 'Side', width: '84px', cell: (a) => <SideBadge side={a.signal} /> },
    { key: 'conf', header: 'Conf', width: '64px', align: 'right', cell: (a) => <ConfidenceCell alert={a} />, sortValue: (a) => a.confidence, title: `Calibrated chance right; review below ${prob(threshold)}` },
    { key: 'target', header: 'Target %', width: '76px', priority: 2, align: 'right', cell: (a) => (a.expected_return_pct ? pct(Math.abs(a.expected_return_pct)) : DASH), sortValue: (a) => Math.abs(a.expected_return_pct ?? 0) },
    { key: 'horizon', header: 'Horizon', width: '132px', priority: 4, cell: (a) => <span className="text-text-2" title={a.impact_horizon}>{horizonShort(a.impact_horizon)}</span> },
    { key: 'event', header: 'Event', cell: (a) => <span className="text-text-2" title={a.event || a.event_summary}>{a.event || a.event_summary}</span> },
    { key: 'act', header: <span className="sr-only">Actions</span>, width: '156px', align: 'right', cell: (a) => <ReviewButtons alert={a} /> },
  ]

  const liveCols: Column<Alert>[] = [
    { key: 'ticker', header: 'Ticker', width: '112px', cell: (a) => <TickerCell alert={a} />, sortValue: (a) => a.instruments?.[0] },
    { key: 'side', header: 'Side', width: '84px', cell: (a) => <SideBadge side={a.signal} /> },
    { key: 'conf', header: 'Conf', width: '60px', align: 'right', cell: (a) => <ConfidenceCell alert={a} />, sortValue: (a) => a.confidence },
    { key: 'entry', header: 'Entry', width: '84px', priority: 4, align: 'right', cell: (a) => price(a.entry_price) },
    { key: 'last', header: 'Last', width: '84px', align: 'right', cell: (a) => <span className={liveState(a, now).label === 'Stale' ? 'text-text-3' : ''}>{price(a.last_price)}</span> },
    { key: 'move', header: 'Move %', width: '92px', align: 'right', cell: (a) => <Delta value={a.move_pct} flash />, sortValue: (a) => a.move_pct, title: "Move in the call's favour since entry" },
    { key: 'progress', header: 'To target', width: '140px', priority: 3, cell: (a) => <BulletBar move={a.move_pct} target={a.expected_return_pct} />, sortValue: (a) => (a.move_pct ?? 0) / Math.abs(a.expected_return_pct || 1) },
    { key: 'left', header: 'Left', width: '64px', priority: 3, align: 'right', cell: (a) => <span className="text-text-2">{horizonLeft(a, now).text}</span>, sortValue: (a) => horizonLeft(a, now).endMs, title: 'Estimated trading time left in the horizon' },
    { key: 'state', header: 'State', width: '88px', priority: 2, cell: (a) => <LiveStateBadge alert={a} now={now} /> },
    { key: 'age', header: 'Age', width: '56px', priority: 5, align: 'right', cell: (a) => <span className="text-text-3" title={utc(a.timestamp)}>{age(a.timestamp, now)}</span>, sortValue: (a) => -(toMs(a.timestamp) ?? 0) },
    { key: 'event', header: 'Event', priority: 6, cell: (a) => <span className="text-text-2" title={a.event || a.event_summary}>{a.event || a.event_summary}</span> },
  ]

  const posCols: Column<Row>[] = [
    { key: 'acct', header: 'Account', width: '120px', priority: 2, cell: (p) => String(p.account_name ?? DASH) },
    { key: 'sym', header: 'Symbol', width: '96px', cell: (p) => <span className="font-semibold">{String(p.broker_symbol ?? p.symbol ?? DASH)}</span> },
    { key: 'side', header: 'Side', width: '84px', cell: (p) => <SideBadge side={String(p.side)} /> },
    { key: 'qty', header: 'Qty', width: '80px', align: 'right', cell: (p) => num(p.qty as number, 4) },
    { key: 'entry', header: 'Entry', width: '88px', priority: 2, align: 'right', cell: (p) => price(p.entry_price as number) },
    { key: 'tp', header: 'TP', width: '88px', priority: 3, align: 'right', cell: (p) => price(p.tp as number) },
    { key: 'ends', header: 'Ends', priority: 2, cell: (p) => <span className="text-text-2">{p.horizon_end ? clock(String(p.horizon_end), now) : DASH}</span> },
  ]

  const eventCols: Column<Row>[] = [
    { key: 'ts', header: 'Time', width: '64px', cell: (e) => <span className="num text-text-3">{clock(String(e.ts), now)}</span> },
    { key: 'code', header: 'Event', width: '160px', cell: (e) => (
      <span className={e.level === 'error' ? 'text-danger' : e.level === 'warn' ? 'text-warn' : 'text-text-1'}>
        {e.level === 'error' ? 'Error · ' : e.level === 'warn' ? 'Warn · ' : ''}{String(e.code)}
      </span>
    ) },
    { key: 'detail', header: 'Detail', cell: (e) => <span className="text-text-3">{e.detail ? JSON.stringify(e.detail) : ''}</span> },
  ]

  const oldest = review.length ? review[review.length - 1] : null
  const today = summary?.today

  const kpis = (
    <div className="grid shrink-0 grid-cols-3 gap-px bg-surface-0 xl:grid-cols-6">
      <Kpi label="Awaiting review" value={review.length} tone={review.length ? 'text-review' : 'text-text-1'}
        context={oldest ? `oldest ${age(oldest.timestamp, now)}` : 'queue clear'} />
      <Kpi label="Live calls" value={live.length} context={summary ? `${summary.live_calls} per server` : undefined} />
      <Kpi label="Hit rate today" value={today?.hit_rate != null ? prob(today.hit_rate) : DASH}
        context={today ? `${today.right} of ${today.closed} closed right` : undefined} />
      <Kpi label="Stale prices" value={stale} tone={stale ? 'text-warn' : 'text-text-1'} context={`of ${live.length} live (>10 min, market open)`} />
      <Kpi label="Engine" value={summary?.engine ? (summary.engine.reachable ? `${summary.engine.accounts_healthy}/${summary.engine.accounts_total}` : 'Offline') : DASH}
        tone={summary?.engine && !summary.engine.reachable ? 'text-danger' : 'text-text-1'} context="accounts healthy" />
      <Kpi label="Kill switch" value={(summary?.engine.global_kill ?? globalKill) ? 'ON' : 'Off'}
        tone={(summary?.engine.global_kill ?? globalKill) ? 'text-danger' : 'text-text-1'}
        context={<Link to="/execution" className="hover:text-text-1 hover:underline">Execution controls</Link>} />
    </div>
  )

  const panes = (
    <Split id="desk-rows-live-first" orientation="vertical">
      <Pane id="live" defaultSize="44" minSize="8">
        <Panel title="Live calls" count={live.length} className="h-full"
          actions={stale > 0 ? <Badge tone="warn">{stale} stale</Badge> : null}>
          <DataTable label="Live calls" rows={live} columns={liveCols} rowKey={(a) => a.alert_id}
            selectedKey={selected} onSelect={(a) => setSelected(a.alert_id)}
            rowClassName={(a) => (liveState(a, now).label === 'Stale' ? 'opacity-80' : '')}
            empty={<EmptyState title={loaded ? 'No calls running' : 'Loading…'} />} />
        </Panel>
      </Pane>
      <Handle orientation="vertical" />
      <Pane id="review" defaultSize="34" minSize="8">
        <Panel title="Review queue" count={review.length} className="h-full"
          actions={<ReviewBulkActions count={review.length} />}>
          <DataTable label="Alerts awaiting review" rows={review} columns={reviewCols} rowKey={(a) => a.alert_id}
            rowClassName={() => 'bg-review-fill'}
            selectedKey={selected} onSelect={(a) => setSelected(a.alert_id)} onRowKey={reviewKey}
            empty={<EmptyState title={loaded ? 'Nothing to review' : 'Loading…'} detail={error ?? 'Held alerts appear here first.'} />} />
        </Panel>
      </Pane>
      <Handle orientation="vertical" />
      <Pane id="engine" defaultSize="22" minSize="6">
        <Split id="desk-engine" orientation="horizontal">
          <Pane id="positions" defaultSize="58" minSize="20">
            <Panel title="Open positions" count={offline ? 'engine offline' : positions.length} className="h-full"
              actions={<Link to="/execution" className="text-[11px] text-text-3 hover:text-text-1 hover:underline">Manage</Link>}>
              <DataTable label="Open engine positions" density="compact" rows={positions} columns={posCols}
                rowKey={(p) => String(p.position_id)}
                empty={<EmptyState title={offline ? 'Execution engine offline' : 'No open positions'} />} />
            </Panel>
          </Pane>
          <Handle orientation="horizontal" />
          <Pane id="events" defaultSize="42" minSize="15">
            <Panel title="Engine events" className="h-full">
              <DataTable label="Recent engine events" density="compact" rows={events.slice(0, 20)} columns={eventCols}
                rowKey={(e) => String(e.id)} empty={<EmptyState title="No recent events" />} />
            </Panel>
          </Pane>
        </Split>
      </Pane>
    </Split>
  )

  const detail = selected ? <AlertDetail alertId={selected} onClose={() => setSelected(null)} /> : null

  if (phone) {
    // Phones: the same desk rearranged — three numbers, then one list at a
    // time behind tabs, and the call's detail as a full-screen sheet.
    const tabs = [
      { key: 'live' as const, label: 'Live', count: live.length },
      { key: 'review' as const, label: 'Review', count: review.length },
      { key: 'engine' as const, label: 'Engine', count: positions.length },
    ]
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface-0">
        <div className="grid shrink-0 grid-cols-3 gap-px">
          <Kpi label="To review" value={review.length} tone={review.length ? 'text-review' : 'text-text-1'}
            context={oldest ? `oldest ${age(oldest.timestamp, now)}` : 'clear'} />
          <Kpi label="Live" value={live.length} context={stale ? `${stale} stale` : 'all fresh'} />
          <Kpi label="Hit rate" value={today?.hit_rate != null ? prob(today.hit_rate) : DASH}
            context={today ? `${today.right}/${today.closed} today` : undefined} />
        </div>
        <div role="tablist" aria-label="Desk lists" className="mt-px flex shrink-0 bg-surface-1">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`flex-1 border-b-2 py-2 text-[13px] ${tab === t.key ? 'border-accent text-text-1' : 'border-transparent text-text-3'}`}>
              {t.label} <span className="num text-text-3">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-surface-1">
          {tab === 'review' && (
            <>
            <div className="flex justify-end border-b border-surface-2 px-3 py-1.5"><ReviewBulkActions count={review.length} /></div>
            <AlertList mode="review" rows={review} now={now} selectedKey={selected} onSelect={(a) => setSelected(a.alert_id)}
              empty={<EmptyState title={loaded ? 'Nothing to review' : 'Loading…'} detail={error ?? undefined} />} />
            </>
          )}
          {tab === 'live' && (
            <AlertList mode="live" rows={live} now={now} selectedKey={selected} onSelect={(a) => setSelected(a.alert_id)}
              empty={<EmptyState title={loaded ? 'No calls running' : 'Loading…'} />} />
          )}
          {tab === 'engine' && (
            <div className="flex flex-col gap-px bg-surface-0">
              <Panel title="Open positions" count={offline ? 'engine offline' : positions.length}>
                <DataTable label="Open engine positions" density="compact" rows={positions} columns={posCols}
                  rowKey={(p) => String(p.position_id)}
                  empty={<EmptyState title={offline ? 'Execution engine offline' : 'No open positions'} />} />
              </Panel>
              <Panel title="Engine events">
                <DataTable label="Recent engine events" density="compact" rows={events.slice(0, 20)} columns={eventCols}
                  rowKey={(e) => String(e.id)} empty={<EmptyState title="No recent events" />} />
              </Panel>
            </div>
          )}
        </div>
        {detail && <div className="fixed inset-0 z-40 bg-surface-1">{detail}</div>}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-px bg-surface-0">
      {kpis}
      <div className="relative min-h-0 flex-1 overflow-clip">
        {wide ? (
          <Split id="desk-columns" orientation="horizontal">
            <Pane id="main" defaultSize="70" minSize="35">{panes}</Pane>
            <Handle orientation="horizontal" />
            <Pane id="detail" panelRef={detailPanel} defaultSize="30" minSize="18" collapsible collapsedSize="0"
              className="bg-surface-1">
              {detail}
            </Pane>
          </Split>
        ) : (
          <>
            {panes}
            {detail && (
              // Narrow screens: the detail slides over the tables instead of squeezing them.
              <div className="absolute inset-y-0 right-0 z-20 w-full max-w-[460px] border-l border-border bg-surface-1 shadow-2xl">
                {detail}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
