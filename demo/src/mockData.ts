export interface SeatVerdict {
  seat: 'Quant' | 'Lawyer' | 'Skeptic' | 'Historian' | 'Judge'
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
  summary: string
}

export interface DemoSignal {
  id: string
  time: string
  ticker: string
  side: 'LONG' | 'SHORT'
  conf: number
  entry: string
  last: string
  movePct: number
  targetPct: number
  horizon: string
  left: string
  state: 'LIVE' | 'REVIEW' | 'CLOSED'
  outcome?: 'HIT' | 'MISS' | 'OPEN'
  event: string
  latencyMs: number
  seats: SeatVerdict[]
}

export interface HealthComponent {
  name: string
  group: 'Ingest' | 'Pipeline' | 'Boardroom' | 'Stores' | 'Managed'
  status: 'Operational' | 'Standby'
  detail: string
  uptime: string
}

export const SYNTHETIC_SIGNALS: DemoSignal[] = [
  {
    id: 'sig-01',
    time: '14:22:08 UTC',
    ticker: 'ACME',
    side: 'LONG',
    conf: 84,
    entry: '142.30',
    last: '145.15',
    movePct: 2.0,
    targetPct: 3.5,
    horizon: '24h',
    left: '18h 12m',
    state: 'LIVE',
    outcome: 'OPEN',
    event: '8-K Material Contract Filing (Synthetic)',
    latencyMs: 8420,
    seats: [
      { seat: 'Quant', stance: 'BULLISH', confidence: 86, summary: 'Abnormal volume +2.4σ with positive post-filing drift baseline.' },
      { seat: 'Lawyer', stance: 'BULLISH', confidence: 82, summary: 'Primary source rights verified; binding multi-year revenue commitment.' },
      { seat: 'Skeptic', stance: 'NEUTRAL', confidence: 61, summary: 'Margin impact depends on Q3 fulfillment ramp; watch guidance.' },
      { seat: 'Historian', stance: 'BULLISH', confidence: 80, summary: '4 of 5 comparable supplier awards repriced +3–5% within 24h.' },
      { seat: 'Judge', stance: 'BULLISH', confidence: 84, summary: 'Consensus LONG; high source integrity and favorable risk/reward.' },
    ],
  },
  {
    id: 'sig-02',
    time: '13:55:41 UTC',
    ticker: 'NOVA',
    side: 'SHORT',
    conf: 78,
    entry: '88.40',
    last: '86.90',
    movePct: -1.7,
    targetPct: -3.0,
    horizon: '48h',
    left: '41h 05m',
    state: 'LIVE',
    outcome: 'OPEN',
    event: 'Regulatory Notice — Clinical Delay (Synthetic)',
    latencyMs: 9150,
    seats: [
      { seat: 'Quant', stance: 'BEARISH', confidence: 79, summary: 'Options skew shifted +14% toward downside puts post-release.' },
      { seat: 'Lawyer', stance: 'BEARISH', confidence: 85, summary: 'Formal agency hold confirmed; timeline pushed at least 2 quarters.' },
      { seat: 'Skeptic', stance: 'BEARISH', confidence: 74, summary: 'Cash runway mitigates insolvency risk, but near-term catalysts vanish.' },
      { seat: 'Historian', stance: 'BEARISH', confidence: 77, summary: 'Peer clinical holds averaged -4.2% over 48h.' },
      { seat: 'Judge', stance: 'BEARISH', confidence: 78, summary: 'Consensus SHORT with strict stop discipline.' },
    ],
  },
  {
    id: 'sig-03',
    time: '14:29:12 UTC',
    ticker: 'VECT',
    side: 'LONG',
    conf: 71,
    entry: '64.10',
    last: '64.10',
    movePct: 0.0,
    targetPct: 2.8,
    horizon: '12h',
    left: '11h 45m',
    state: 'REVIEW',
    outcome: 'OPEN',
    event: 'Earnings Pre-Announcement Beat (Synthetic)',
    latencyMs: 10240,
    seats: [
      { seat: 'Quant', stance: 'BULLISH', confidence: 76, summary: 'Preliminary EPS +11% above consensus midpoint.' },
      { seat: 'Lawyer', stance: 'NEUTRAL', confidence: 65, summary: 'Unaudited preliminary figures; full 10-Q pending.' },
      { seat: 'Skeptic', stance: 'NEUTRAL', confidence: 58, summary: 'One-time tax benefit accounts for ~30% of beat.' },
      { seat: 'Historian', stance: 'BULLISH', confidence: 74, summary: 'Prior pre-announcements held gains in 70% of sessions.' },
      { seat: 'Judge', stance: 'BULLISH', confidence: 71, summary: 'Held for human review due to Skeptic tax-benefit flag.' },
    ],
  },
  {
    id: 'sig-04',
    time: '09:12:04 UTC',
    ticker: 'ORBT',
    side: 'LONG',
    conf: 82,
    entry: '215.00',
    last: '222.50',
    movePct: 3.49,
    targetPct: 3.2,
    horizon: '24h',
    left: 'Closed',
    state: 'CLOSED',
    outcome: 'HIT',
    event: 'Index Inclusion Announcement (Synthetic)',
    latencyMs: 7890,
    seats: [
      { seat: 'Quant', stance: 'BULLISH', confidence: 85, summary: 'Passive rebalance demand estimated at 4.1× ADV.' },
      { seat: 'Lawyer', stance: 'BULLISH', confidence: 88, summary: 'Official index committee notice verified.' },
      { seat: 'Skeptic', stance: 'NEUTRAL', confidence: 66, summary: 'Partial front-running already visible in prior 5 sessions.' },
      { seat: 'Historian', stance: 'BULLISH', confidence: 81, summary: 'Strong historical inclusion drift through effective date.' },
      { seat: 'Judge', stance: 'BULLISH', confidence: 82, summary: 'Target reached (+3.49%).' },
    ],
  },
]

export const SYNTHETIC_HEALTH: HealthComponent[] = [
  { name: 'Ingest Adapters (18)', group: 'Ingest', status: 'Operational', detail: '18/18 active (SEC, News, Filings, Market)', uptime: '99.94%' },
  { name: 'Redpanda Event Bus', group: 'Pipeline', status: 'Operational', detail: 'Kafka-compatible local broker · 0 stalled partitions', uptime: '99.99%' },
  { name: 'Dedup & Enrichment', group: 'Pipeline', status: 'Operational', detail: 'Extract · Resolve · Sentiment · Mapping · Combiner', uptime: '99.97%' },
  { name: 'BGE-M3 Local Embedder', group: 'Pipeline', status: 'Operational', detail: 'In-container embedding & reranking · <120 ms p95', uptime: '99.98%' },
  { name: '5-Seat AI Boardroom', group: 'Boardroom', status: 'Operational', detail: 'Quant · Lawyer · Skeptic · Historian · Judge (9.1s p95)', uptime: '99.95%' },
  { name: 'PostgreSQL + pgvector + TimescaleDB', group: 'Stores', status: 'Operational', detail: 'HNSW index · Row-Level Security active', uptime: '99.99%' },
  { name: 'Memgraph + Redis Stack', group: 'Stores', status: 'Operational', detail: 'Graph relationships & RediSearch cache', uptime: '99.98%' },
  { name: 'Azure AI Foundry Gateway', group: 'Managed', status: 'Operational', detail: 'Managed Identity · Zero external LLM egress', uptime: '99.99%' },
  { name: 'Azure Key Vault + WORM Blob', group: 'Managed', status: 'Operational', detail: 'Standard KV · 7-year immutable audit retention', uptime: '100.00%' },
]

export const SYNTHETIC_AUDIT = [
  { time: '2026-11-14 14:20:01 UTC', actor: 'demo_viewer', action: 'auth.session.start', result: 'ok', ip: '192.0.2.10' },
  { time: '2026-11-14 14:15:44 UTC', actor: 'boardroom_svc', action: 'foundry.token.refresh', result: 'ok', ip: '192.0.2.24' },
  { time: '2026-11-14 13:50:12 UTC', actor: 'audit_archiver', action: 'worm.blob.append', result: 'ok', ip: '192.0.2.31' },
]
