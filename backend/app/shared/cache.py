"""Cache abstraction layer wrapping Redis."""


class CacheBackend:
    """Simple cache backend that wraps a Redis client."""

    def __init__(self, client):
        self._client = client

    async def ping(self) -> bool:
        """Ping the cache backend. Returns True if healthy."""
        if self._client is None:
            return False
        try:
            await self._client.ping()
            return True
        except Exception:
            return False


async def get_cache() -> CacheBackend:
    """Get a cache backend instance. Returns a no-op backend if Redis is unavailable."""
    from app.utils.redis import get_redis
    client = await get_redis()
    return CacheBackend(client)
