import { useMemo, useState } from 'react'
import { Activity, Bell, Check, LayoutGrid, Shield, X } from 'lucide-react'
import {
  SYNTHETIC_AUDIT,
  SYNTHETIC_HEALTH,
  SYNTHETIC_SIGNALS,
  type DemoSignal,
} from './mockData'

type View = 'desk' | 'alerts' | 'health' | 'security'

function SideBadge({ side }: { side: 'LONG' | 'SHORT' }) {
  return (
    <span
      className={`num inline-block border px-1.5 py-0.5 text-[11px] font-medium ${
        side === 'LONG'
          ? 'border-up/40 bg-up/10 text-up'
          : 'border-down/40 bg-down/10 text-down'
      }`}
    >
      {side}
    </span>
  )
}

export function App() {
  const [view, setView] = useState<View>('desk')
  const [signals, setSignals] = useState<DemoSignal[]>(SYNTHETIC_SIGNALS)
  const [selectedId, setSelectedId] = useState<string>('sig-01')
  const [query, setQuery] = useState('')
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL')

  const liveCalls = useMemo(() => signals.filter((s) => s.state === 'LIVE'), [signals])
  const reviewQueue = useMemo(() => signals.filter((s) => s.state === 'REVIEW'), [signals])
  const selected = useMemo(
    () => signals.find((s) => s.id === selectedId) ?? liveCalls[0] ?? signals[0],
    [signals, selectedId, liveCalls],
  )

  const filteredAlerts = useMemo(
    () =>
      signals.filter((s) => {
        if (sideFilter !== 'ALL' && s.side !== sideFilter) return false
        if (query.trim()) {
          const q = query.toLowerCase()
          return s.ticker.toLowerCase().includes(q) || s.event.toLowerCase().includes(q)
        }
        return true
      }),
    [signals, sideFilter, query],
  )

  const handleReview = (id: string, approve: boolean) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, state: approve ? 'LIVE' : 'CLOSED', outcome: approve ? 'OPEN' : 'MISS' } : s)),
    )
  }

  const navItems: { id: View; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'desk', label: 'Desk', icon: LayoutGrid },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'health', label: 'Health', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="flex h-screen flex-col bg-surface-0 text-text-1">
      {/* Top Status Chrome */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-accent">
            <span className="inline-flex h-5 w-5 items-center justify-center bg-accent text-[11px] font-bold text-on-accent">
              Δ
            </span>
            <span>Delta Desk</span>
          </div>
          <span className="border border-accent/40 bg-review-fill px-1.5 py-0.5 text-[11px] text-accent">
            DEMO / SYNTHETIC DATA
          </span>
          <span className="num border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-2">
            {reviewQueue.length} to review
          </span>
        </div>

        <div className="hidden items-center gap-4 text-[11px] text-text-2 md:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-up" /> Boardroom 5/5 Seats
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-up" /> Ingest 18/18
          </span>
          <span className="num text-accent">Azure Stack &lt;$1k/mo</span>
          <span className="text-text-3">Zero External Egress</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left Navigation Rail */}
        <nav className="flex w-16 shrink-0 flex-col border-r border-border bg-surface-1 py-2">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active
                    ? 'border-l-2 border-accent bg-surface-2 text-accent'
                    : 'text-text-3 hover:bg-surface-2/60 hover:text-text-1'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Main Workspace */}
        <main className="min-w-0 flex-1 overflow-auto p-3">
          {view === 'desk' && (
            <div className="flex flex-col gap-3">
              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-6">
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Awaiting review</div>
                  <div className="num text-lg font-semibold text-review">{reviewQueue.length}</div>
                  <div className="text-[11px] text-text-3">Human-in-the-loop</div>
                </div>
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Live calls</div>
                  <div className="num text-lg font-semibold text-text-1">{liveCalls.length}</div>
                  <div className="text-[11px] text-text-3">Synthetic showcase</div>
                </div>
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Boardroom p95</div>
                  <div className="num text-lg font-semibold text-up">9.1s</div>
                  <div className="text-[11px] text-text-3">Sub-budget 15.0s</div>
                </div>
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Local Embedder</div>
                  <div className="num text-lg font-semibold text-up">BGE-M3</div>
                  <div className="text-[11px] text-text-3">&lt;120ms in-container</div>
                </div>
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Services Online</div>
                  <div className="num text-lg font-semibold text-up">38 / 38</div>
                  <div className="text-[11px] text-text-3">Single-host compose</div>
                </div>
                <div className="bg-surface-1 px-3 py-2">
                  <div className="label">Cloud Cost Savings</div>
                  <div className="num text-lg font-semibold text-accent">&gt;99%</div>
                  <div className="text-[11px] text-text-3">~$105k → &lt;$1k/mo</div>
                </div>
              </div>

              {/* Split: Tables Left, 5-Seat Boardroom Inspector Right */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="flex flex-col gap-3 lg:col-span-7">
                  {/* Live Calls */}
                  <section className="border border-border bg-surface-1">
                    <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                      <span className="text-xs font-semibold text-accent">Live calls</span>
                      <span className="text-[11px] text-text-3">Click a row to inspect 5-Seat Boardroom</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-surface-2 text-[11px] text-accent">
                          <tr>
                            <th className="px-3 py-1.5">Ticker</th>
                            <th className="px-2 py-1.5">Side</th>
                            <th className="px-2 py-1.5">Conf</th>
                            <th className="px-2 py-1.5">Move %</th>
                            <th className="px-2 py-1.5">Target %</th>
                            <th className="px-2 py-1.5">Left</th>
                            <th className="px-3 py-1.5">Event</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {liveCalls.map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => setSelectedId(s.id)}
                              className={`cursor-pointer transition-colors ${
                                selected?.id === s.id ? 'bg-surface-3' : 'hover:bg-surface-2/60'
                              }`}
                            >
                              <td className="num px-3 py-2 font-semibold text-text-1">{s.ticker}</td>
                              <td className="px-2 py-2">
                                <SideBadge side={s.side} />
                              </td>
                              <td className="num px-2 py-2 text-text-1">{s.conf}%</td>
                              <td className={`num px-2 py-2 ${s.movePct >= 0 ? 'text-up' : 'text-down'}`}>
                                {s.movePct >= 0 ? '+' : ''}
                                {s.movePct.toFixed(2)}%
                              </td>
                              <td className="num px-2 py-2 text-text-2">{s.targetPct.toFixed(1)}%</td>
                              <td className="num px-2 py-2 text-text-2">{s.left}</td>
                              <td className="px-3 py-2 text-text-2">{s.event}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Review Queue */}
                  <section className="border border-border bg-surface-1">
                    <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                      <span className="text-xs font-semibold text-accent">Review queue</span>
                      <span className="text-[11px] text-text-3">Interactive synthetic approval</span>
                    </div>
                    {reviewQueue.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-text-3">
                        Nothing to review — queue clear.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {reviewQueue.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedId(s.id)}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-surface-2/60"
                          >
                            <div className="flex items-center gap-3">
                              <span className="num font-semibold text-text-1">{s.ticker}</span>
                              <SideBadge side={s.side} />
                              <span className="num text-review">{s.conf}%</span>
                              <span className="text-text-2">{s.event}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReview(s.id, true)
                                }}
                                className="inline-flex items-center gap-1 border border-up/40 bg-up/10 px-2 py-0.5 text-[11px] text-up hover:bg-up/20"
                              >
                                <Check className="h-3 w-3" /> Confirm
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReview(s.id, false)
                                }}
                                className="inline-flex items-center gap-1 border border-down/40 bg-down/10 px-2 py-0.5 text-[11px] text-down hover:bg-down/20"
                              >
                                <X className="h-3 w-3" /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right: 5-Seat AI Boardroom Inspector */}
                <section className="border border-border bg-surface-1 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                    <span className="text-xs font-semibold text-accent">
                      5-Seat AI Boardroom — {selected.ticker}
                    </span>
                    <span className="num text-[11px] text-text-3">{selected.latencyMs} ms total</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="border border-border bg-surface-2 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-1">{selected.event}</span>
                        <SideBadge side={selected.side} />
                      </div>
                      <div className="num mt-1 text-[11px] text-text-3">
                        Entry {selected.entry} · Last {selected.last} · Horizon {selected.horizon}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {selected.seats.map((seat) => (
                        <div key={seat.seat} className="border border-border bg-surface-0 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-accent">{seat.seat}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`num text-[11px] ${
                                  seat.stance === 'BULLISH'
                                    ? 'text-up'
                                    : seat.stance === 'BEARISH'
                                      ? 'text-down'
                                      : 'text-warn'
                                }`}
                              >
                                {seat.stance}
                              </span>
                              <span className="num text-[11px] text-text-2">{seat.confidence}%</span>
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-text-2">{seat.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {view === 'alerts' && (
            <div className="border border-border bg-surface-1">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-xs font-semibold text-accent">Alerts (Synthetic Showcase)</span>
                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter ticker or event..."
                    className="border border-border bg-surface-0 px-2 py-1 text-xs text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none"
                  />
                  <select
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value as 'ALL' | 'LONG' | 'SHORT')}
                    className="border border-border bg-surface-0 px-2 py-1 text-xs text-text-1 focus:border-accent focus:outline-none"
                  >
                    <option value="ALL">Any side</option>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-2 text-[11px] text-accent">
                  <tr>
                    <th className="px-3 py-1.5">Published</th>
                    <th className="px-2 py-1.5">Ticker</th>
                    <th className="px-2 py-1.5">Side</th>
                    <th className="px-2 py-1.5">Conf</th>
                    <th className="px-2 py-1.5">State</th>
                    <th className="px-2 py-1.5">Move %</th>
                    <th className="px-3 py-1.5">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAlerts.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-2/60">
                      <td className="num px-3 py-2 text-text-2">{s.time}</td>
                      <td className="num px-2 py-2 font-semibold">{s.ticker}</td>
                      <td className="px-2 py-2">
                        <SideBadge side={s.side} />
                      </td>
                      <td className="num px-2 py-2">{s.conf}%</td>
                      <td className="num px-2 py-2 text-text-2">{s.state}</td>
                      <td className={`num px-2 py-2 ${s.movePct >= 0 ? 'text-up' : 'text-down'}`}>
                        {s.movePct >= 0 ? '+' : ''}
                        {s.movePct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-text-2">{s.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'health' && (
            <div className="space-y-3">
              <div className="border border-border bg-surface-1 px-3 py-2 text-xs">
                <span className="font-semibold text-up">All 38 services operational</span>
                <span className="ml-3 text-text-2">
                  Single-host <code className="num text-accent">Standard_E8ps_v6</code> topology + Azure AI Foundry
                  (Managed Identity)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {SYNTHETIC_HEALTH.map((c) => (
                  <div key={c.name} className="border border-border bg-surface-1 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-text-3">{c.group}</span>
                      <span className="num text-[11px] text-up">✓ {c.status}</span>
                    </div>
                    <div className="mt-1 font-semibold text-text-1">{c.name}</div>
                    <div className="mt-1 text-[11px] text-text-2">{c.detail}</div>
                    <div className="num mt-2 text-[11px] text-accent">Uptime {c.uptime}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'security' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="space-y-2 border border-border bg-surface-1 p-3 text-xs lg:col-span-5">
                <div className="font-semibold text-accent">Enterprise Security Posture</div>
                <ul className="space-y-2 text-text-2">
                  <li>• <strong className="text-text-1">Zero External LLM Egress:</strong> Foundry gateway + local BGE-M3 only.</li>
                  <li>• <strong className="text-text-1">Managed Identity + Key Vault:</strong> Zero static secrets in images.</li>
                  <li>• <strong className="text-text-1">7-Year WORM Audit:</strong> Immutable Azure Blob Cool LRS retention.</li>
                  <li>• <strong className="text-text-1">Row-Level Security:</strong> Point-in-time & source-rights filters in PostgreSQL.</li>
                </ul>
              </div>
              <div className="border border-border bg-surface-1 lg:col-span-7">
                <div className="border-b border-border px-3 py-1.5 text-xs font-semibold text-accent">
                  Synthetic Audit Log (RFC 5737 Demo IPs)
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-surface-2 text-[11px] text-accent">
                    <tr>
                      <th className="px-3 py-1.5">Time</th>
                      <th className="px-2 py-1.5">Actor</th>
                      <th className="px-2 py-1.5">Action</th>
                      <th className="px-2 py-1.5">Result</th>
                      <th className="px-3 py-1.5">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {SYNTHETIC_AUDIT.map((row, idx) => (
                      <tr key={idx}>
                        <td className="num px-3 py-2 text-text-2">{row.time}</td>
                        <td className="num px-2 py-2 text-text-1">{row.actor}</td>
                        <td className="num px-2 py-2 text-text-2">{row.action}</td>
                        <td className="num px-2 py-2 text-up">{row.result}</td>
                        <td className="num px-3 py-2 text-text-3">{row.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
