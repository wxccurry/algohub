import logging

logger = logging.getLogger("algohub.redis")

try:
    import redis.asyncio as aioredis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False
    aioredis = None  # type: ignore

from app.config import settings

redis_client = None  # type: ignore
REFRESH_BLACKLIST_PREFIX = "refresh_bl:"


async def get_redis():
    global redis_client
    if not _REDIS_AVAILABLE:
        logger.warning("Redis library not installed — refresh token blacklist disabled")
        return None
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        except Exception:
            logger.warning("Redis server not available — refresh token blacklist disabled")
            return None
    return redis_client


async def blacklist_refresh_token(jti: str, ttl_seconds: int) -> None:
    r = await get_redis()
    if r is None:
        return
    try:
        await r.setex(f"{REFRESH_BLACKLIST_PREFIX}{jti}", ttl_seconds, "1")
    except Exception:
        logger.warning("Failed to blacklist refresh token (Redis unavailable)")


async def is_refresh_token_blacklisted(jti: str) -> bool:
    r = await get_redis()
    if r is None:
        return False  # If Redis is down, allow all refresh tokens
    try:
        return await r.exists(f"{REFRESH_BLACKLIST_PREFIX}{jti}") > 0
    except Exception:
        return False
