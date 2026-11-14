# Security Policy & Architecture Posture

## Repository Scope

This showcase repository contains **only** high-level architecture documentation and sanitized, non-runnable UI and observability previews. No credentials, API keys, environment files, infrastructure templates, database schemas, or proprietary runtime code are stored here.

## Production Security Posture (Design Summary)

Project Delta's Azure re-architecture preserves enterprise-grade security controls while eliminating over-provisioned network and compute appliances:

- **Zero External LLM Egress:** All model inference routes exclusively through Azure AI Foundry endpoints under private/managed identity controls, or runs locally inside the application container (BGE-M3 embeddings & reranking).
- **Managed Identity & Key Vault:** Secrets and service credentials are stored in Azure Key Vault Standard and accessed via Managed Identity—no static secrets in application images.
- **7-Year WORM Audit Retention:** Immutable audit logs are persisted to Azure Blob Storage (Cool LRS) with Write-Once-Read-Many (WORM) retention policies.
- **Row-Level Security (RLS):** Database access enforces point-in-time and source-rights filters at the PostgreSQL layer, failing closed when required stores are unavailable.
- **Private Host Ingress:** The compute host remains private; public dashboard ingress is routed strictly through the provisioned edge gateway.

## Reporting a Vulnerability

If you discover a security issue or accidental sensitive disclosure in this showcase repository, please report it privately to the repository owner rather than opening a public issue.
