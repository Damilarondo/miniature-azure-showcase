"""License expiry monitor + retention purge stubs (Slice 8 R11-3)."""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from prometheus_client import Gauge

from src.metrics import registry
from src.resolve.runtime_config import required_env

logger = logging.getLogger(__name__)


@dataclass
class LicenseStatus:
    source_id: str
    status: str  # 'ok' | 'warning_30d' | 'warning_7d' | 'expired'
    license_expiry: datetime | None
    days_remaining: float | None


def scan_license_expiries(
    rights_rows: list[dict], now: datetime | None = None
) -> list[LicenseStatus]:
    now = now or datetime.now(timezone.utc)
    out = []
    for r in rights_rows:
        exp = r.get("license_expiry")
        if exp is None:
            out.append(
                LicenseStatus(
                    source_id=r["source_id"],
                    status="ok",
                    license_expiry=None,
                    days_remaining=None,
                )
            )
            continue
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        delta = (exp - now).total_seconds() / 86400.0
        if delta < 0:
            status = "expired"
        elif delta < 7:
            status = "warning_7d"
        elif delta < 30:
            status = "warning_30d"
        else:
            status = "ok"
        out.append(
            LicenseStatus(
                source_id=r["source_id"],
                status=status,
                license_expiry=exp,
                days_remaining=delta,
            )
        )
    return out


def select_for_retention_purge(
    rows: list[dict], retention_max_days: int, now: datetime | None = None
) -> list[dict]:
    """Return rows whose age exceeds retention_max_days and have retention_allowed=True (purge eligible)."""
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=retention_max_days)
    eligible = []
    for r in rows:
        ts = r.get("created_at")
        if ts is None:
            continue
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts < cutoff:
            eligible.append(r)
    return eligible


LICENSE_STATUS_GAUGE = Gauge(
    "delta_source_license_status",
    "Registered sources counted by licence expiry status",
    ["status"],
    registry=registry,
)

TOMBSTONED_CHUNKS_GAUGE = Gauge(
    "delta_rights_tombstoned_chunks",
    "Chunks tombstoned by the most recent licence-expiry scan",
    registry=registry,
)

_RIGHTS_SQL = (
    "SELECT source_id, license_expiry, retention_allowed, derived_data_allowed "
    "FROM source_rights_registry"
)

# Revocation write-path. tombstoned_at is the column every read predicate tests
# (rights_driven_read in migration 0014, chunk_rights_visible in 0025,
# MANDATORY_PIT_FILTER_SQL in src/rag/pgvector_store.py), so stamping it here is
# what makes an expired licence actually disappear from retrieval. The job must
# connect as hitl_role / hitl_user — the only roles granted UPDATE (tombstoned_at).
_TOMBSTONE_SQL = (
    "UPDATE event_chunks SET tombstoned_at = now() "
    "WHERE tombstoned_at IS NULL "
    "AND (source_id = ANY($1::text[]) OR source_ids_present && $1::text[])"
)


async def run_license_expiry_scan(pg_pool: Any, now: datetime | None = None) -> dict:
    """Read source_rights_registry, publish the expiry gauges, tombstone revoked chunks.

    A source is revoked when its licence has expired or when retention /
    derived-data rights were withdrawn. Returns the scan summary.
    """
    async with pg_pool.acquire() as conn:
        rows = [dict(r) for r in await conn.fetch(_RIGHTS_SQL)]
        statuses = scan_license_expiries(rows, now=now)

        counts = {"ok": 0, "warning_30d": 0, "warning_7d": 0, "expired": 0}
        for s in statuses:
            counts[s.status] += 1
        for status, count in counts.items():
            LICENSE_STATUS_GAUGE.labels(status=status).set(count)

        revoked = {s.source_id for s in statuses if s.status == "expired"}
        revoked.update(
            r["source_id"] for r in rows
            if r.get("retention_allowed") is False or r.get("derived_data_allowed") is False
        )

        tombstoned = 0
        if revoked:
            result = await conn.execute(_TOMBSTONE_SQL, sorted(revoked))
            tombstoned = int(result.rsplit(" ", 1)[-1])
        TOMBSTONED_CHUNKS_GAUGE.set(tombstoned)

    return {
        "scanned": len(rows),
        "expired": counts["expired"],
        "revoked_sources": sorted(revoked),
        "tombstoned_chunks": tombstoned,
    }


async def main() -> None:
    """Scheduled-job entrypoint: `python -m src.observability.license_monitor`.

    Connect as hitl_role / hitl_user — that is the only role holding
    UPDATE (tombstoned_at) on event_chunks (migration 0025, phase-5 bootstrap).
    """
    import asyncpg

    # docker-compose supplies POSTGRES_DSN; the Azure ACA apps supply
    # PG_CORE_DSN (infra/azure/modules/cognitive/aca-app-*.bicep). Both names
    # are bound somewhere in this repo -- there is no third.
    pg_dsn = required_env("POSTGRES_DSN", "PG_CORE_DSN")

    pg_pool = await asyncpg.create_pool(pg_dsn, min_size=1, max_size=5)
    try:
        summary = await run_license_expiry_scan(pg_pool)
        logger.info(
            "license expiry scan: scanned=%d expired=%d revoked_sources=%s tombstoned_chunks=%d",
            summary["scanned"],
            summary["expired"],
            summary["revoked_sources"],
            summary["tombstoned_chunks"],
        )
    finally:
        await pg_pool.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
