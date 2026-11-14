import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePanelRef } from 'react-resizable-panels'
import { useHealthStore, type Snapshot } from '../store/healthStore'
import { useNow } from '../hooks/useNow'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { age } from '../lib/format'
import { dialogsOpen } from '../ui/Dialog'
import { EmptyState } from '../ui/primitives'
import { Handle, Pane, Split } from '../ui/Resizable'
import { PipelineMap } from '../components/health/PipelineMap'
import { StageList } from '../components/health/StageList'
import { ComponentsTab } from '../components/health/ComponentsTab'
import { IncidentsTab } from '../components/health/IncidentsTab'
import { ComponentDetail } from '../components/health/ComponentDetail'

type Tab = 'map' | 'components' | 'incidents'
const TABS: [Tab, string][] = [['map', 'Map'], ['components', 'Components'], ['incidents', 'Incidents']]

/** Health of every point: the pipeline map with the root cause ringed, every
 *  component with its history, and the incidents the monitor opened. */
export function HealthView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find(([t]) => t === params.get('tab'))?.[0] ?? 'map'
  const { snapshot, byId, history, error } = useHealthStore()
  const now = useNow(5000)
  const wide = useMediaQuery('(min-width: 1100px)')
  const phone = !useMediaQuery('(min-width: 768px)')
  const detailPanel = usePanelRef()

  useEffect(() => {
    const health = useHealthStore.getState()
    void health.load()
    void health.loadHistory()
    const t = setInterval(() => void useHealthStore.getState().loadHistory(), 60_000)
    return () => clearInterval(t)
  }, [])

  // The split exists only once the first picture has arrived (and on wide screens).
  const mounted = snapshot != null
  useEffect(() => {
    const panel = detailPanel.current
    if (!panel) return
    if (id && panel.isCollapsed()) panel.expand()
    if (!id && !panel.isCollapsed()) panel.collapse()
  }, [id, detailPanel, mounted, wide])

  const open = (cid: string) => navigate({ pathname: `/health/${encodeURIComponent(cid)}`, search: params.toString() })
  const close = () => navigate({ pathname: '/health', search: params.toString() })
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && id && !dialogsOpen()) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!snapshot) {
    return <EmptyState title={error ? 'Health is not available' : 'Loading health…'} detail={error ?? undefined} />
  }

  const body = tab === 'map'
    ? (phone
      ? <div className="h-full overflow-auto"><StageList snapshot={snapshot} onSelect={open} /></div>
      : <PipelineMap snapshot={snapshot} selected={id ?? null} onSelect={open} now={now} />)
    : tab === 'components'
      ? <ComponentsTab snapshot={snapshot} history={history} selected={id ?? null} onSelect={open} now={now} wide={wide} />
      : <IncidentsTab byId={byId} version={snapshot.version} onSelect={open} now={now} />

  const main = (
    <div className="flex h-full min-h-0 flex-col bg-surface-1">
      <HealthBanner snapshot={snapshot} now={now} onRoot={open} onIncidents={() => setTab('incidents')} />
      <div role="tablist" aria-label="Health views" className="flex shrink-0 gap-1 border-b border-border px-2">
        {TABS.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-[13px] ${tab === t ? 'border-accent text-text-1' : 'border-transparent text-text-3 hover:text-text-1'}`}>
            {label}
            {t === 'incidents' && snapshot.incidents && snapshot.incidents.length > 0 && (
              <span className="num ml-1 rounded-sm bg-down px-1 text-[10px] font-semibold text-on-accent">{snapshot.incidents.length}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1">{body}</div>
    </div>
  )

  const detail = id ? <ComponentDetail key={id} id={id} byId={byId} onClose={close} onSelect={open} now={now} /> : null
  if (!wide) {
    return (
      <div className="relative h-full bg-surface-0">
        {main}
        {id && (
          <div className={phone ? 'fixed inset-0 z-40 bg-surface-1'
            : 'absolute inset-y-0 right-0 z-20 w-full max-w-[480px] border-l border-border bg-surface-1 shadow-2xl'}>
            {detail}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="h-full bg-surface-0">
      <Split id="health-columns" orientation="horizontal">
        <Pane id="health-main" defaultSize="68" minSize="40">{main}</Pane>
        <Handle orientation="horizontal" />
        <Pane id="health-detail" panelRef={detailPanel} defaultSize="32" minSize="20" collapsible collapsedSize="0"
          className="bg-surface-1">
          {detail}
        </Pane>
      </Split>
    </div>
  )
}

const LEVEL = {
  ok: 'border-up/50 bg-up/10 text-up',
  degraded: 'border-warn/60 bg-warn/10 text-warn',
  unknown: 'border-warn/60 bg-warn/10 text-warn',
  partial: 'border-down/60 bg-down/10 text-down',
  major: 'border-down/60 bg-down/15 text-down',
} as const
const GLYPH = { ok: '✓', degraded: '!', unknown: '?', partial: '✕', major: '✕' } as const

/** One line in Statuspage's words, naming the root cause; host and shared
 *  infrastructure faults are named before any service's. */
function HealthBanner({ snapshot, now, onRoot, onIncidents }: {
  snapshot: Snapshot
  now: number
  onRoot: (id: string) => void
  onIncidents: () => void
}) {
  const level = snapshot.source === 'live' ? snapshot.banner.level : 'unknown'
  const root = snapshot.banner.root
  const checked = snapshot.generated_at ? age(snapshot.generated_at, now) : '—'
  return (
    <div role="status" aria-live="polite"
      className={`flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm ${LEVEL[level]}`}>
      <span aria-hidden className="font-semibold">{GLYPH[level]}</span>
      <span className="font-medium">{snapshot.banner.text}</span>
      {root && (
        <button className="rounded border border-current px-1.5 text-[11px] hover:bg-surface-2" onClick={() => onRoot(root)}>
          Show root cause
        </button>
      )}
      {snapshot.incidents.length > 0 && (
        <button className="text-[12px] underline" onClick={onIncidents}>
          {snapshot.incidents.length} open incident{snapshot.incidents.length > 1 ? 's' : ''}
        </button>
      )}
      {snapshot.maintenance.length > 0 && <span className="text-[12px] text-accent">{snapshot.maintenance.length} in maintenance</span>}
      <span className="num ml-auto text-[11px] text-text-3">
        {snapshot.source === 'live' ? `checked ${checked} ago`
          : snapshot.source === 'stale' ? `Health monitor not responding — last picture ${checked} old`
            : 'Health monitor not responding — last stored state'}
      </span>
    </div>
  )
}
