"""Prometheus histograms for boardroom latency per Slice 8 spec."""

ECH1_SUB_BUDGETS_MS = {'rag': 500, 'r1': 6000, 'r2': 5000, 'judge': 3000, 'total': 15000}


def _hist(name: str, labels: list[str]):
    try:
        from prometheus_client import Histogram
        buckets = (50, 100, 250, 500, 1000, 2500, 5000, 10000, 15000, 30000, 60000)
        return Histogram(name, name, labels, buckets=buckets)
    except ImportError:
        class _Nop:
            def labels(self, **kw): return self
            def observe(self, v): return None
        return _Nop()


SEAT_LATENCY_HIST = _hist('delta_boardroom_seat_latency_ms', ['seat', 'round', 'model_version'])
JUDGE_LATENCY_HIST = _hist('delta_boardroom_judge_latency_ms', ['model_version'])
RAG_LEG_LATENCY_HIST = _hist('delta_boardroom_rag_leg_latency_ms', ['leg'])
SESSION_LATENCY_HIST = _hist('delta_boardroom_session_latency_ms', ['deadline_degraded'])
TTFT_HIST = _hist('delta_boardroom_ttft_ms', ['seat', 'model_version'])


def observe_seat_latency(seat: str, round: int, model_version: str, latency_ms: float) -> None:
    SEAT_LATENCY_HIST.labels(seat=seat, round=str(round), model_version=model_version).observe(latency_ms)


def observe_judge_latency(model_version: str, latency_ms: float) -> None:
    JUDGE_LATENCY_HIST.labels(model_version=model_version).observe(latency_ms)


def observe_rag_leg_latency(leg: str, latency_ms: float) -> None:
    RAG_LEG_LATENCY_HIST.labels(leg=leg).observe(latency_ms)


def observe_session_latency(latency_ms: float, deadline_degraded: bool) -> None:
    SESSION_LATENCY_HIST.labels(deadline_degraded=str(deadline_degraded).lower()).observe(latency_ms)


def observe_ttft(seat: str, model_version: str, ttft_ms: float) -> None:
    TTFT_HIST.labels(seat=seat, model_version=model_version).observe(ttft_ms)


def check_sub_budget_breached(stage: str, observed_p95_ms: float) -> bool:
    budget = ECH1_SUB_BUDGETS_MS.get(stage)
    return budget is not None and observed_p95_ms > budget
