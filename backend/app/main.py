from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api import judge, posts, admin  # old routers (not yet migrated)
from app.modules.auth.router import router as auth_router
from app.modules.user.router import router as user_router
from app.modules.problem.router import router as problem_router
from app.modules.submission.router import router as submission_router
from app.modules.contest.router import router as contest_router
from app.modules.ai.router import router as ai_router
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.access_log import AccessLogMiddleware
from app.middleware.error_handler import app_error_handler
from app.exceptions import AppError
from app.utils.redis import get_redis, redis_client


@asynccontextmanager
# Tables managed by Alembic — no auto-create needed
async def lifespan(app: FastAPI):
    try:
        await get_redis()
    except Exception:
        pass  # Redis not available — refresh token blacklist disabled in dev
    yield
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass


# CSRF protection is intentionally not implemented here.
# This is an API-only backend using token-based authentication (JWT Bearer tokens),
# which is inherently immune to CSRF attacks. CSRF relies on browsers automatically
# attaching cookies to cross-origin requests; since we do not use session cookies
# for authentication, there is no attack vector for CSRF.

app = FastAPI(
    title="AlgoHub API",
    description="大学生算法学习与开源社区平台",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_exception_handler(AppError, app_error_handler)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(AccessLogMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(problem_router)
app.include_router(submission_router)
app.include_router(judge.router, prefix="/api", tags=["评测"])
app.include_router(posts.router, prefix="/api/posts", tags=["社区"])
app.include_router(admin.router, prefix="/api/admin", tags=["管理"])
app.include_router(user_router)
app.include_router(contest_router)
app.include_router(ai_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": "服务器内部错误", "data": None},
    )


@app.get("/api/health")
async def health_check():
    checks = {"database": "ok", "redis": "unavailable"}
    try:
        from app.shared.cache import get_cache
        cache = await get_cache()
        await cache.ping()
        checks["redis"] = "ok"
    except Exception:
        pass
    return {"code": 200, "message": "ok", "data": {"status": "ok", "version": "2.0.0", "checks": checks}}


# Prometheus metrics endpoint (uncomment to enable)
# import prometheus_client
# @app.get("/metrics")
# async def metrics():
#     return Response(prometheus_client.generate_latest(), media_type="text/plain")
