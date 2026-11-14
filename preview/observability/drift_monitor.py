"""Drift monitor — compares recent stats to a baseline distribution."""

import math


def compute_drift_score(baseline: list[float], recent: list[float]) -> float:
    """Returns a non-negative drift score; 0 = no drift, larger = more drift.

    Uses normalized Wasserstein-1 (mean absolute deviation of sorted percentiles).
    """
    if not baseline or not recent:
        return 0.0
    bs = sorted(baseline)
    rs = sorted(recent)
    n_b = len(bs)
    n_r = len(rs)
    # Compare matching percentiles 10..90.
    diffs = []
    for p in range(10, 100, 10):
        bi = bs[min(int(p / 100 * n_b), n_b - 1)]
        ri = rs[min(int(p / 100 * n_r), n_r - 1)]
        diffs.append(abs(bi - ri))
    mean_diff = sum(diffs) / len(diffs)
    scale = max(abs(b) for b in bs) or 1.0
    return mean_diff / scale


class DriftMonitor:
    def __init__(self, threshold: float = 0.20):
        self.threshold = threshold

    def check(self, baseline: list[float], recent: list[float]) -> dict:
        score = compute_drift_score(baseline, recent)
        return {
            'score': score,
            'threshold': self.threshold,
            'drifted': score > self.threshold,
        }
