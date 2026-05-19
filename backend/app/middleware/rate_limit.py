# Rate limit documentation:
# - Global: 100 requests/minute per IP
# - Auth endpoints: 20 requests/minute per IP
# - Submission: 5 requests/minute per user
# - AI endpoints: 20 requests/day per user (free tier)

import logging
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

logger = logging.getLogger("algohub")

limiter = Limiter(key_func=get_remote_address)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"code": 429, "message": "请求过于频繁，请稍后再试", "data": None},
    )
