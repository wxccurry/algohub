from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api import auth, problems, submissions, judge, posts, admin, users
from app.database import init_db
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.utils.redis import get_redis, redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
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


app = FastAPI(
    title="AlgoHub API",
    description="大学生算法学习与开源社区平台",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(problems.router, prefix="/api/problems", tags=["题库"])
app.include_router(submissions.router, prefix="/api", tags=["提交"])
app.include_router(judge.router, prefix="/api", tags=["评测"])
app.include_router(posts.router, prefix="/api/posts", tags=["社区"])
app.include_router(admin.router, prefix="/api/admin", tags=["管理"])
app.include_router(users.router, prefix="/api/users", tags=["用户"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": "服务器内部错误", "data": None},
    )


@app.get("/api/health")
async def health_check():
    return {"code": 200, "message": "ok", "data": None}
