"""Anthropic prompt-cache helpers."""

ANTHROPIC_MIN_CACHE_TOKENS = 1024


def build_anthropic_cache_marker(text: str, ttl: str = 'ephemeral') -> dict:
    """Return a system-block dict with Anthropic cache_control marker."""
    return {
        'type': 'text',
        'text': text,
        'cache_control': {'type': ttl},
    }


def estimate_tokens(text: str) -> int:
    """Rough heuristic: 1 token ~= 4 chars."""
    return len(text) // 4


def should_cache(text: str, min_tokens: int = ANTHROPIC_MIN_CACHE_TOKENS) -> bool:
    return estimate_tokens(text) >= min_tokens


class CacheStats:
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.tokens_cached_read = 0
        self.tokens_cached_created = 0

    def record_hit(self, tokens_read: int) -> None:
        self.hits += 1
        self.tokens_cached_read += tokens_read

    def record_miss(self, tokens_created: int) -> None:
        self.misses += 1
        self.tokens_cached_created += tokens_created

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0
