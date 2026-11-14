"""Daily token-budget computation and runtime tracking.

Implements R4 default policy:
    daily_budget = min(monthly_budget / working_days, p95_shadow_daily * 1.5)
"""

from __future__ import annotations


def compute_daily_budget(
    monthly_budget_usd: float,
    p95_shadow_daily: float,
    working_days_per_month: int = 22,
) -> float:
    """Compute the per-day token budget in USD.

    Args:
        monthly_budget_usd: Total monthly budget in USD.
        p95_shadow_daily: 95th-percentile observed daily spend from shadow mode.
        working_days_per_month: Number of working days per month (default 22).

    Returns:
        The lesser of the prorated monthly base and 1.5x the shadow p95 cap.
    """
    base = monthly_budget_usd / max(working_days_per_month, 1)
    shadow_cap = p95_shadow_daily * 1.5
    return min(base, shadow_cap)


class TokenBudgetTracker:
    """In-memory tracker for daily token spend against a USD budget."""

    def __init__(self, daily_budget_usd: float):
        self.daily_budget_usd = daily_budget_usd
        self._spent_today = 0.0

    def record_spend(self, cost_usd: float) -> None:
        """Record an additional spend amount against today's budget."""
        self._spent_today += cost_usd

    def remaining(self) -> float:
        """Return remaining USD for today (clamped at 0)."""
        return max(0.0, self.daily_budget_usd - self._spent_today)

    def is_exhausted(self) -> bool:
        """Return True when spend meets or exceeds the daily budget."""
        return self._spent_today >= self.daily_budget_usd

    def reset_day(self) -> None:
        """Reset the daily spend counter (e.g. at UTC rollover)."""
        self._spent_today = 0.0
