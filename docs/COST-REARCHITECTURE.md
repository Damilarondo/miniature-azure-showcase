# Azure Cost Re-Architecture Summary

> **Result:** Reduced projected monthly Azure infrastructure spend from **~$101,000–$106,000/month** to **under $1,000/month** (>99% reduction) with **zero loss of functional capability**.

## 1. Baseline Problem (~$101k–$106k/mo)

The legacy enterprise deployment provisioned a multi-region, high-availability-everywhere PaaS estate designed for hyperscale traffic rather than the actual workload profile:

| Legacy Component | Baseline Monthly Cost |
|---|---:|
| Event Hubs Dedicated | ~$65,000/mo |
| 3× PostgreSQL Flexible Server (E16/E16/E8, ZR-HA) | ~$12,000/mo |
| Azure Managed Redis X150 | ~$9,000/mo |
| AKS Node Pools (4 pools) | ~$6,000/mo |
| Memgraph Enterprise HA | ~$3,000/mo |
| Firewall Premium + Bastion + Front Door/WAF + App Gateway | ~$3,000/mo |
| Paired-Region DR / Geo-Replication | ~$2,000/mo |
| Key Vault Premium HSM & Misc | ~$1,000/mo |
| **Total Legacy Baseline** | **~$101,000–$106,000/mo** |

---

## 2. Re-Architected Topology (<$1,000/mo)

Because the entire 38-service application stack already runs cleanly via container orchestration on a single machine, the AKS + dedicated PaaS estate was replaced with a right-sized single-host topology paired with targeted managed services:

### Retained Managed Services

| Service | Tier / SKU | Purpose | Est. Monthly Cost |
|---|---|---|---:|
| **Compute Host** | `Standard_E8ps_v6` | Runs the 38-service container stack (Redpanda, PostgreSQL/pgvector/TimescaleDB, Memgraph, Redis) | Right-sized VM |
| **Container Registry** | Basic | Private image hosting | ~$5.07/mo |
| **Key Vault** | Standard | Managed Identity secret management | ~$1.00/mo |
| **Static Web Apps** | Free | Frontend static asset delivery | $0.00/mo |
| **Container Apps Jobs** | Consumption | 4 event-driven / cron jobs (scale-to-zero) | ~$2.00/mo |
| **Blob Storage** | Cool LRS | 7-year immutable WORM audit archive (~500 GB) | ~$7.50/mo |

### Serverless-Per-Service Alternative (Evaluated & Rejected)

Running ~30 always-on services on Azure Container Apps Consumption was modeled and rejected (~$592/mo in baseline compute alone, exhausting the free grant in minutes). Container Apps is retained **only** for genuinely event-driven jobs where scale-to-zero delivers real savings.

### Preserved Guarantees vs. Explicit Tradeoff

- **Preserved:** All ~38 services, all 18 ingest adapters, Kafka protocol, pgvector HNSW, TimescaleDB, Row-Level Security, 7-year WORM audit retention, Managed Identity, and zero external LLM egress.
- **Explicit Tradeoff:** Single-AZ compute with snapshot + WAL disaster recovery instead of a warm paired-region active/active deployment.
