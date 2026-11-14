# System Architecture Overview

> **Scope:** Architectural summary for evaluation and partner review. Implementation details, schemas, and deployment manifests are omitted.

## 1. The 5-Seat AI Boardroom

Rather than relying on a single monolithic LLM call, Project Delta orchestrates a structured multi-agent **Boardroom** where five distinct analytical personas evaluate each signal:

1. **Quant** — Quantitative and statistical framing
2. **Lawyer** — Policy, compliance, and contractual/source-rights lens
3. **Skeptic** — Adversarial challenge and downside/counter-thesis stress-testing
4. **Historian** — Precedent matching and historical regime context
5. **Judge** — Final synthesis and calibrated decision output

### Resilience & Latency Discipline

- **Dynamic Seat Fallback:** If a primary seat endpoint degrades or hits rate limits, the fallback chain dynamically rebinds provider, endpoint, credentials, and model per target without dropping the session.
- **Latency Sub-Budgets:** Every boardroom stage is instrumented against strict p95 latency targets (`rag`: 500 ms, `r1`: 6,000 ms, `r2`: 5,000 ms, `judge`: 3,000 ms, `total`: 15,000 ms) as shown in [preview/observability/latency_metrics.py](../preview/observability/latency_metrics.py).
- **Daily Token Budgeting:** Runtime spend is governed by a prorated monthly cap bounded by observed 95th-percentile shadow spend ([preview/observability/token_budget.py](../preview/observability/token_budget.py)).

---

## 2. Hybrid Retrieval & Data Runtime

- **Local Embedding & Reranking:** BGE-M3 embedding and reranking lanes run directly inside the application container, eliminating external embedding API latency and egress.
- **Unified Data Stack:**
  - **PostgreSQL 16 + pgvector + TimescaleDB:** Relational state, HNSW vector search, and time-series storage with point-in-time and source-rights enforcement.
  - **Memgraph:** Graph relationship traversal.
  - **Redis Stack (RediSearch):** Low-latency caching and secondary indexing.
  - **Redpanda:** Kafka-compatible event streaming across all 18 ingest adapters and ~38 services.
- **Fail-Closed Guarantees:** Search paths enforce point-in-time and source-rights filters and fail closed if required stores are unavailable.

---

## 3. Operator Dashboard & Observability

The [preview/ui/](../preview/ui/) directory provides a non-runnable preview of the operator interface:

- **Desk View:** Signal monitoring and decision workspace
- **Health View:** Service-level liveness, fleet state, and incident visibility
- **Alerts View:** Real-time confidence-gated alerting
- **Security View:** Step-up authentication and access controls
