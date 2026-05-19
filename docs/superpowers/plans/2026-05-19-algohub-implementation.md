# AlgoHub 2.0 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AlgoHub 从原型重构为对标 LeetCode 的顶级刷题平台，8 个阶段覆盖 Modular Monolith 架构、题库、AI Copilot、可视化和可观测性。

**Architecture:** FastAPI Modular Monolith + Next.js 16 前端。后端拆为独立 modules/ (auth/problem/submission/contest/post/ai/user)，每模块自含 router/service/schemas/models。评测保持 Celery + Docker 方案，Phase 2 升级 Go Judge。

**Tech Stack:** Python/FastAPI · TypeScript/Next.js 16 · PostgreSQL 15 · Redis 7 · Celery · Docker · TailwindCSS v4 · shadcn/ui · Monaco Editor · DeepSeek API

---

## 文件结构映射

```
backend/
├── app/
│   ├── main.py                      [修改] 应用入口
│   ├── config.py                    [修改] 合并评审配置
│   ├── exceptions.py                [新建] 统一异常类
│   ├── middleware/                   [新建] 中间件目录
│   │   ├── request_id.py
│   │   ├── access_log.py
│   │   └── error_handler.py
│   ├── dependencies/                [重组] 原 app/dependencies.py 拆分
│   │   ├── auth.py
│   │   ├── pagination.py
│   │   └── db.py
│   ├── modules/                     [新建] 模块化业务
│   │   ├── auth/{router,service,schemas,models}.py
│   │   ├── problem/{router,service,repository,schemas,models}.py
│   │   ├── submission/{router,service,repository,schemas,models}.py
│   │   ├── contest/{router,service,schemas,models}.py
│   │   ├── post/{router,service,schemas,models}.py
│   │   ├── ai/{router,service,schemas,prompts/}.py
│   │   └── user/{router,service,schemas,models}.py
│   ├── shared/                      [重组] 原 utils/ 改名
│   │   ├── database.py
│   │   ├── cache.py
│   │   ├── security.py
│   │   └── response.py
│   └── judge/                       [保留+增强]
│       ├── client.py
│       └── callback.py
├── alembic/versions/                [新建迁移]
│   ├── 0006_problem_enhance.py
│   ├── 0007_user_checkins.py
│   ├── 0008_contest_extensions.py
│   ├── 0009_visualization_meta.py
│   ├── 0010_user_favorites.py
│   ├── 0011_ai_usage_audit.py
│   └── 0012_submissions_partition.py
└── scripts/
    └── import_problems.py           [新建]

frontend/
├── components/
│   ├── layout/Header.tsx            [修改]
│   ├── layout/Footer.tsx            [修改]
│   ├── editor/MonacoEditor.tsx      [修改]
│   ├── editor/SubmissionPanel.tsx   [修改]
│   ├── editor/SubmissionResult.tsx  [修改]
│   ├── ai/AIFloatingAssistant.tsx   [新建]
│   ├── ai/AIChatPanel.tsx           [新建]
│   ├── visualization/AlgoCanvas.tsx  [修改]
│   ├── visualization/renderers/     [新建]
│   │   ├── TwoPointersRenderer.tsx
│   │   ├── BinarySearchRenderer.tsx
│   │   ├── DPRenderer.tsx
│   │   ├── BFSRenderer.tsx
│   │   ├── LinkedListRenderer.tsx
│   │   └── SortingRenderer.tsx
│   ├── contest/ContestTimer.tsx     [新建]
│   └── contest/RankingTable.tsx     [新建]
├── hooks/
│   ├── useHotkeys.ts                [新建]
│   ├── useScrollDirection.ts        [新建]
│   └── useSSE.ts                    [新建]
├── app/
│   ├── problems/[id]/page.tsx       [修改] 主攻文件
│   ├── problems/page.tsx            [修改]
│   ├── contests/page.tsx            [新建]
│   ├── contests/[id]/page.tsx       [新建]
│   └── globals.css                  [修改]
└── package.json                     [修改]
```

---

### Task 1: 后端架构重构 — 目录 + 异常体系

**Files:**
- Create: `backend/app/exceptions.py`
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/middleware/request_id.py`
- Create: `backend/app/middleware/access_log.py`
- Create: `backend/app/middleware/error_handler.py`
- Create: `backend/app/modules/__init__.py`

- [ ] **Step 1: 创建统一异常类**

```python
# backend/app/exceptions.py
from typing import Any

class AppError(Exception):
    """业务异常基类，所有模块抛此异常由 middleware 统一处理"""
    def __init__(self, code: int, message: str, detail: dict[str, Any] | None = None):
        self.code = code
        self.message = message
        self.detail = detail

class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(404, f"{resource} not found", {"id": identifier})

class ForbiddenError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(403, message)

class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(401, message)

class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(409, message)

class ValidationError(AppError):
    def __init__(self, errors: list[dict[str, Any]]):
        super().__init__(422, "Validation failed", {"errors": errors})

class RateLimitError(AppError):
    def __init__(self, retry_after: int = 60):
        super().__init__(429, "Too many requests", {"retry_after": retry_after})
```

- [ ] **Step 2: 创建 RequestID 中间件**

```python
# backend/app/middleware/request_id.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
        request.state.trace_id = trace_id
        response = await call_next(request)
        response.headers["X-Trace-ID"] = trace_id
        return response
```

- [ ] **Step 3: 创建全局异常处理中间件**

```python
# backend/app/middleware/error_handler.py
from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import AppError

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.code if exc.code < 500 else 500,
        content={
            "code": exc.code,
            "message": exc.message,
            "data": None,
            "errors": exc.detail.get("errors") if exc.detail else None,
            "trace_id": getattr(request.state, "trace_id", None),
        }
    )
```

- [ ] **Step 4: 创建结构化访问日志中间件**

```python
# backend/app/middleware/access_log.py
import time, logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("algohub.access")

class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "trace_id": getattr(request.state, "trace_id", None),
            }
        )
        return response
```

- [ ] **Step 5: 在 main.py 注册中间件**

```python
# backend/app/main.py — 在创建 app 后添加:
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.access_log import AccessLogMiddleware
from app.middleware.error_handler import app_error_handler
from app.exceptions import AppError

app.add_middleware(RequestIDMiddleware)
app.add_middleware(AccessLogMiddleware)
app.add_exception_handler(AppError, app_error_handler)
```

- [ ] **Step 6: 验证**

```bash
cd backend && python -c "from app.exceptions import NotFoundError; e = NotFoundError('Problem', 1); assert e.code == 404; print('OK')"
```

---

### Task 2: 后端架构重构 — 模块化拆分 (auth + user)

**Files:**
- Create: `backend/app/modules/auth/__init__.py`
- Create: `backend/app/modules/auth/router.py`
- Create: `backend/app/modules/auth/service.py`
- Create: `backend/app/modules/auth/schemas.py`
- Create: `backend/app/modules/auth/models.py`
- Create: `backend/app/modules/user/__init__.py`
- Create: `backend/app/modules/user/router.py`
- Create: `backend/app/modules/user/service.py`
- Create: `backend/app/modules/user/schemas.py`
- Create: `backend/app/modules/user/models.py`
- Create: `backend/app/modules/__init__.py`
- Create: `backend/app/shared/__init__.py`
- Create: `backend/app/shared/database.py`
- Create: `backend/app/shared/security.py`
- Create: `backend/app/shared/response.py`

- [ ] **Step 1: 迁移 shared 层**

```python
# backend/app/shared/database.py — 从 app/database.py 迁移
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# backend/app/shared/security.py — JWT + bcrypt

# backend/app/shared/response.py — success() / error() helpers
```

- [ ] **Step 2: 提取 auth 模块**

```python
# backend/app/modules/auth/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.shared.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id = Column(Integer, primary_key=True)
    nickname = Column(String(32), unique=True, nullable=True)
    avatar = Column(String, nullable=True)
    gender = Column(Integer, default=0)
    bio = Column(String(160), nullable=True)
    preferred_languages = Column(String(128), nullable=True)
    github_url = Column(String(256), nullable=True)
    blog_url = Column(String(256), nullable=True)
    current_status = Column(Integer, default=1)
    school = Column(String(100), nullable=True)
    major = Column(String(50), nullable=True)
    organization = Column(String(128), nullable=True)
    region_code = Column(String(12), nullable=True)
    solved_count = Column(Integer, default=0)
    rating = Column(Integer, default=1500)
    streak_days = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    contribution = Column(Integer, default=0)
    last_checkin_at = Column(DateTime, nullable=True)
    privacy_settings = Column(JSON, default=dict)
```

```python
# backend/app/modules/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    profile: Optional["ProfileOut"] = None

    class Config:
        from_attributes = True

class ProfileOut(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    gender: int = 0
    gender_label: str = ""
    bio: Optional[str] = None
    school: Optional[str] = None
    solved_count: int = 0
    rating: int = 1500

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = Field(None, min_length=2, max_length=32)
    avatar: Optional[str] = None
    gender: Optional[int] = None
    bio: Optional[str] = Field(None, max_length=160)
    preferred_languages: Optional[str] = None
    github_url: Optional[str] = None
    blog_url: Optional[str] = None
    current_status: Optional[int] = None
    school: Optional[str] = None
    major: Optional[str] = None
    organization: Optional[str] = None
    region_code: Optional[str] = None
    privacy_settings: Optional[dict] = None
```

- [ ] **Step 3: 实现 auth service**

```python
# backend/app/modules/auth/service.py
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.exceptions import ConflictError, UnauthorizedError, NotFoundError
from app.shared.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.shared.cache import get_cache
from app.modules.auth.models import User, UserProfile
from app.modules.auth.schemas import RegisterRequest, TokenResponse, UserOut, ProfileOut

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, req: RegisterRequest) -> UserOut:
        existing = await self.db.execute(
            select(User).where((User.username == req.username) | (User.email == req.email))
        )
        if existing.scalar_one_or_none():
            raise ConflictError("Username or email already exists")

        user = User(
            username=req.username,
            email=req.email,
            password_hash=hash_password(req.password),
        )
        self.db.add(user)
        await self.db.flush()

        profile = UserProfile(user_id=user.id)
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(user)
        return self._to_out(user)

    async def login(self, username: str, password: str) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid username or password")
        if not user.is_active:
            raise ForbiddenError("Account is disabled")

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def get_me(self, user_id: int) -> UserOut:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)
        return self._to_out(user)

    async def update_profile(self, user_id: int, req) -> ProfileOut:
        result = await self.db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundError("Profile", user_id)

        update_data = req.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return ProfileOut.model_validate(profile)

    def _to_out(self, user: User) -> UserOut:
        profile = None
        if hasattr(user, 'profile') and user.profile:
            profile = ProfileOut.model_validate(user.profile)
        return UserOut(id=user.id, username=user.username, email=user.email, role=user.role, profile=profile)
```

- [ ] **Step 4: 实现 auth router**

```python
# backend/app/modules/auth/router.py
from fastapi import APIRouter, Depends
from app.shared.database import get_db
from app.modules.auth.service import AuthService
from app.modules.auth.schemas import RegisterRequest, LoginRequest, ProfileUpdateRequest
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(req: RegisterRequest, db=Depends(get_db)):
    svc = AuthService(db)
    return {"code": 201, "message": "ok", "data": (await svc.register(req)).model_dump()}

@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    svc = AuthService(db)
    return {"code": 200, "message": "ok", "data": (await svc.login(req.username, req.password)).model_dump()}

@router.get("/me")
async def get_me(current_user=Depends(get_current_user), db=Depends(get_db)):
    svc = AuthService(db)
    return {"code": 200, "message": "ok", "data": (await svc.get_me(current_user.id)).model_dump()}

@router.put("/me")
async def update_profile(req: ProfileUpdateRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    svc = AuthService(db)
    return {"code": 200, "message": "ok", "data": (await svc.update_profile(current_user.id, req)).model_dump()}
```

- [ ] **Step 5: 实现 auth dependencies**

```python
# backend/app/dependencies/auth.py
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.security import decode_access_token
from app.exceptions import UnauthorizedError, ForbiddenError

async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    user_id = int(payload.get("sub"))
    # 简化的 user 查询 — 实际从 DB 获取
    from sqlalchemy import select
    from app.modules.auth.models import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError()
    return user

def require_role(*roles: str):
    async def checker(current_user = Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenError(f"Requires role: {roles}")
        return current_user
    return checker

require_login = require_role("user", "author", "admin")
require_author_or_admin = require_role("author", "admin")
require_admin = require_role("admin")
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/exceptions.py backend/app/middleware/ backend/app/modules/auth/ backend/app/modules/user/ backend/app/shared/ backend/app/dependencies/
git commit -m "feat: Modular Monolith — auth/user module + unified exception system"
```

---

### Task 3: 数据库迁移 — 新增 7 张表

**Files:**
- Create: `backend/alembic/versions/0006_problem_enhance.py`
- Create: `backend/alembic/versions/0007_user_checkins.py`
- Create: `backend/alembic/versions/0008_contest_extensions.py`
- Create: `backend/alembic/versions/0009_visualization_meta.py`
- Create: `backend/alembic/versions/0010_user_favorites.py`
- Create: `backend/alembic/versions/0011_ai_usage_audit.py`
- Create: `backend/alembic/versions/0012_submissions_partition.py`

- [ ] **Step 1: 创建 problem 增强迁移**

```python
# backend/alembic/versions/0006_problem_enhance.py
"""problem table enhancements

Revision ID: 0006
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column("problems", sa.Column("slug", sa.String(200), unique=True))
    op.add_column("problems", sa.Column("view_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("accept_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("submit_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("upvote_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("downvote_count", sa.Integer(), server_default="0"))
    op.create_index("idx_problems_slug", "problems", ["slug"])
    op.create_index("idx_problems_list", "problems", ["is_public", "difficulty", "id"])

    op.create_table("problem_hints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.UniqueConstraint("problem_id", "sort_order"),
    )

    op.create_table("company_tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_name", sa.String(100), nullable=False),
        sa.Column("frequency", sa.Integer(), server_default="0"),
        sa.UniqueConstraint("problem_id", "company_name"),
    )

    op.create_table("similar_problems",
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("similar_problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("similarity_reason", sa.String(50)),
    )

    op.create_table("problem_votes",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("vote_type", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table("user_problem_status",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="todo"),
        sa.Column("first_solved_at", sa.DateTime(timezone=True)),
        sa.Column("attempt_count", sa.Integer(), server_default="0"),
    )

    op.create_table("problem_lists",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_public", sa.Boolean(), server_default="false"),
        sa.Column("problem_ids", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.add_column("problem_solutions", sa.Column("vote_count", sa.Integer(), server_default="0"))
    op.add_column("problem_solutions", sa.Column("solution_type", sa.String(20), server_default="user"))
    op.add_column("problem_solutions", sa.Column("is_official", sa.Boolean(), server_default="false"))


def downgrade():
    op.drop_table("problem_lists")
    op.drop_table("user_problem_status")
    op.drop_table("problem_votes")
    op.drop_table("similar_problems")
    op.drop_table("company_tags")
    op.drop_table("problem_hints")
    op.drop_column("problems", "downvote_count")
    op.drop_column("problems", "upvote_count")
    op.drop_column("problems", "submit_count")
    op.drop_column("problems", "accept_count")
    op.drop_column("problems", "view_count")
    op.drop_column("problems", "slug")
    op.drop_column("problem_solutions", "is_official")
    op.drop_column("problem_solutions", "solution_type")
    op.drop_column("problem_solutions", "vote_count")
```

- [ ] **Step 2: 创建 user_checkins 迁移**

```python
# backend/alembic/versions/0007_user_checkins.py
"""user checkins + profile enhancements

Revision ID: 0007
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table("user_checkins",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("checkin_date", sa.Date(), primary_key=True),
        sa.Column("problem_count", sa.Integer(), server_default="0"),
    )
    op.create_index("idx_checkins_user_range", "user_checkins", ["user_id", sa.text("checkin_date DESC")])
    op.add_column("user_profiles", sa.Column("max_streak", sa.Integer(), server_default="0"))
    op.add_column("user_profiles", sa.Column("contribution", sa.Integer(), server_default="0"))
    op.add_column("user_profiles", sa.Column("last_checkin_at", sa.DateTime(timezone=True)))

def downgrade():
    op.drop_table("user_checkins")
    op.drop_column("user_profiles", "last_checkin_at")
    op.drop_column("user_profiles", "contribution")
    op.drop_column("user_profiles", "max_streak")
```

- [ ] **Step 3: 创建 contest 扩展迁移**

```python
# backend/alembic/versions/0008_contest_extensions.py
def upgrade():
    op.create_table("contest_participants",
        sa.Column("contest_id", sa.Integer(), sa.ForeignKey("contests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("score", sa.Integer(), server_default="0"),
        sa.Column("rank", sa.Integer()),
        sa.Column("penalty", sa.Integer(), server_default="0"),
    )
    op.create_table("contest_problems",
        sa.Column("contest_id", sa.Integer(), sa.ForeignKey("contests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("display_id", sa.String(1), nullable=False),
        sa.Column("points", sa.Integer(), server_default="100"),
    )

def downgrade():
    op.drop_table("contest_problems")
    op.drop_table("contest_participants")
```

- [ ] **Step 4: 创建可视化元数据 + 审计表迁移**

```python
# backend/alembic/versions/0009_visualization_meta.py
def upgrade():
    op.create_table("visualization_frames_meta",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("algorithm_type", sa.String(50)),
        sa.Column("total_steps", sa.Integer(), nullable=False),
        sa.Column("default_input", sa.JSON(), nullable=False),
        sa.Column("frames_path", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("user_favorites",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("user_favorites")
    op.drop_table("visualization_frames_meta")
```

- [ ] **Step 5: 创建 AI 使用日志 + 审计日志迁移**

```python
# backend/alembic/versions/0011_ai_usage_audit.py
def upgrade():
    op.create_table("ai_usage_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("endpoint", sa.String(50), nullable=False),
        sa.Column("prompt_version", sa.String(20)),
        sa.Column("tokens_in", sa.Integer(), server_default="0"),
        sa.Column("tokens_out", sa.Integer(), server_default="0"),
        sa.Column("error_signature", sa.String(32)),
        sa.Column("cache_hit", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50)),
        sa.Column("resource_id", sa.Integer()),
        sa.Column("detail", sa.JSON()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("ai_usage_logs")
```

- [ ] **Step 6: 创建 submissions 分区迁移**

```python
# backend/alembic/versions/0012_submissions_partition.py
def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS submissions_partitioned (
            id SERIAL,
            user_id INTEGER REFERENCES users(id),
            problem_id INTEGER REFERENCES problems(id),
            contest_id INTEGER,
            language VARCHAR(20) NOT NULL,
            code TEXT NOT NULL,
            code_hash VARCHAR(64),
            status VARCHAR(20) DEFAULT 'Pending',
            execution_time INTEGER,
            execution_memory INTEGER,
            score INTEGER DEFAULT 0,
            error_message TEXT,
            judge_log TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMPTZ DEFAULT now()
        ) PARTITION BY RANGE (created_at);
    """)
    # 创建每月分区
    for month_offset in range(0, 12):
        op.execute(f"""
            CREATE TABLE IF NOT EXISTS submissions_y2026_m{month_offset+1:02d}
            PARTITION OF submissions_partitioned
            FOR VALUES FROM ('2026-{month_offset+1:02d}-01') TO ('2026-{month_offset+2:02d}-01');
        """)

def downgrade():
    op.execute("DROP TABLE IF EXISTS submissions_partitioned CASCADE")
```

- [ ] **Step 7: 运行迁移并验证**

```bash
cd backend && alembic upgrade head
```

```bash
cd backend && python -c "
from app.shared.database import engine, Base
from sqlalchemy import inspect
# 验证所有表存在
async def check():
    async with engine.begin() as conn:
        tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        required = ['problem_hints', 'company_tags', 'similar_problems', 'problem_votes', 'user_problem_status', 'user_checkins', 'contest_participants', 'contest_problems', 'visualization_frames_meta', 'user_favorites', 'ai_usage_logs', 'audit_logs']
        for t in required:
            assert t in tables, f'Missing table: {t}'
        print('All tables verified OK')
import asyncio; asyncio.run(check())
"
```

- [ ] **Step 8: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: database migrations — 7 new tables + partitions + indexes"
```

---

### Task 4: 前端交互基础设施

**Files:**
- Create: `frontend/hooks/useHotkeys.ts`
- Create: `frontend/hooks/useScrollDirection.ts`
- Create: `frontend/hooks/useSSE.ts`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: 实现 useHotkeys hook**

```typescript
// frontend/hooks/useHotkeys.ts
"use client";
import { useEffect } from "react";

interface HotkeyDef {
  key: string;
  ctrl?: boolean;
  handler: () => void;
  enabled?: boolean;
}

export function useHotkeys(hotkeys: HotkeyDef[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (hk.enabled === false) continue;
        const ctrlMatch = hk.ctrl ? (e.ctrlKey || e.metaKey) : true;
        if (e.key === hk.key && ctrlMatch) {
          e.preventDefault();
          hk.handler();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
}
```

- [ ] **Step 2: 实现 useScrollDirection hook**

```typescript
// frontend/hooks/useScrollDirection.ts
"use client";
import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 30, minSpeed = 0.3) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastTime = useRef(Date.now());

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const now = Date.now();
          const deltaY = window.scrollY - lastScrollY.current;
          const deltaT = now - lastTime.current;
          const speed = Math.abs(deltaY) / Math.max(deltaT, 1);

          if (window.scrollY < 100) {
            setVisible(true);
          } else if (deltaY > threshold && speed > minSpeed) {
            setVisible(false);
          } else if (deltaY < -10) {
            setVisible(true);
          }

          lastScrollY.current = window.scrollY;
          lastTime.current = now;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, minSpeed]);

  return visible;
}
```

- [ ] **Step 3: 实现 useSSE hook**

```typescript
// frontend/hooks/useSSE.ts
"use client";
import { useEffect, useRef, useCallback } from "react";

interface SSEOptions {
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE(url: string, options: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!options.enabled) return;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        options.onMessage(parsed);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = (event) => {
      options.onError?.(event);
      es.close();
    };
    eventSourceRef.current = es;
  }, [url, options]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return {
    close: () => eventSourceRef.current?.close(),
    reconnect: connect,
  };
}
```

- [ ] **Step 4: 注入全局交互 CSS token 到 globals.css**

```css
/* frontend/app/globals.css — 追加交互令牌 */
@layer base {
  :root {
    --duration-instant: 50ms;
    --duration-fast: 100ms;
    --duration-normal: 200ms;
    --duration-slow: 300ms;
  }

  * {
    transition-delay: 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
}
```

- [ ] **Step 5: 在 layout.tsx 启用 ThemeProvider**

```typescript
// frontend/app/layout.tsx — 在原有 layout 基础上包裹 ThemeProvider
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* 原有 Header + children + Footer */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/hooks/ frontend/app/globals.css frontend/app/layout.tsx
git commit -m "feat: interaction foundation — hotkeys, scroll direction, SSE hooks + CSS tokens + dark mode"
```

---

### Task 5: 前端评测结果四阶段叙事 + 防误触

**Files:**
- Create: `frontend/components/editor/SubmitButton.tsx`
- Modify: `frontend/components/editor/SubmissionResult.tsx`
- Modify: `frontend/app/problems/[id]/page.tsx`

- [ ] **Step 1: 创建 SubmitButton 组件（含长按防误触）**

```tsx
// frontend/components/editor/SubmitButton.tsx
"use client";
import { useState, useRef, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSubmit: () => Promise<void>;
  disabled?: boolean;
}

export default function SubmitButton({ onSubmit, disabled }: Props) {
  const [phase, setPhase] = useState<"idle" | "confirming" | "loading">("idle");
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const startTime = useRef(0);
  const [progress, setProgress] = useState(0);

  const onPressStart = useCallback(() => {
    if (disabled || phase !== "idle") return;
    startTime.current = Date.now();
    pressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setProgress(Math.min(elapsed / 180, 1));
      if (elapsed >= 180) {
        clearInterval(pressTimer.current);
        setPhase("loading");
        onSubmit().finally(() => setPhase("idle"));
      }
    }, 16);
  }, [disabled, phase, onSubmit]);

  const onPressEnd = useCallback(() => {
    clearInterval(pressTimer.current);
    if (progress < 1) {
      setProgress(0);
      setPhase("idle");
    }
  }, [progress]);

  return (
    <Button
      size="lg"
      disabled={disabled || phase === "loading"}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      className="relative overflow-hidden min-w-[120px]"
    >
      {phase === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      <span className="relative z-10">
        {phase === "loading" ? "提交中..." : "提交"}
      </span>
      {phase === "idle" && progress > 0 && (
        <div
          className="absolute inset-0 bg-primary/20 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </Button>
  );
}
```

- [ ] **Step 2: 增强 SubmissionResult 组件（四阶段叙事）**

```tsx
// frontend/components/editor/SubmissionResult.tsx — 增强版
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Phase = "submitted" | "running" | "done" | "minimized";

interface SubmissionResultProps {
  phase: Phase;
  status?: string;
  currentCase?: number;
  totalCases?: number;
  executionTime?: number;
  executionMemory?: number;
  beatsPercent?: number;
  failedCase?: { input: string; expected: string; actual: string; caseNumber: number };
  aiHint?: string;
}

export default function SubmissionResult({ phase: initialPhase, status, currentCase, totalCases, executionTime, executionMemory, beatsPercent, failedCase, aiHint }: SubmissionResultProps) {
  const [phase, setPhase] = useState(initialPhase);
  const isAC = status === "Accepted";

  if (phase === "minimized") {
    return (
      <motion.div
        className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full cursor-pointer text-sm font-medium ${isAC ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        onClick={() => setPhase("done")}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        {isAC ? "✅ " : "❌ "}{status}
        <ChevronUp className="inline h-3 w-3 ml-1" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, maxHeight: 0 }}
        animate={{ opacity: 1, y: 0, maxHeight: 320 }}
        exit={{ opacity: 0, y: 20, maxHeight: 0 }}
        className={`rounded-lg border-2 p-4 ${isAC ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50"}`}
      >
        {phase === "submitted" && (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
            <span>已加入评测队列...</span>
          </div>
        )}

        {phase === "running" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在评测... {currentCase}/{totalCases}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${((currentCase || 0) / (totalCases || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              {isAC ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </motion.div>
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span className={`text-lg font-bold ${isAC ? "text-green-600" : "text-red-600"}`}>
                {status}
              </span>
            </div>

            {isAC && (
              <div className="text-sm space-y-1 mb-3">
                <div>运行时间: {executionTime}ms</div>
                <div>内存消耗: {(executionMemory || 0 / 1024).toFixed(1)}MB</div>
                {beatsPercent && <div>击败了 {beatsPercent}% 的提交 🏆</div>}
              </div>
            )}

            {!isAC && failedCase && (
              <div className="text-sm space-y-1 mb-3">
                <div className="font-medium">第 {failedCase.caseNumber} 个用例失败:</div>
                <div className="bg-muted p-2 rounded">
                  <div>输入: {failedCase.input}</div>
                  <div>期望: {failedCase.expected}</div>
                  <div className="text-red-600">实际: {failedCase.actual}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(failedCase.input);
                    toast.success("已复制失败用例");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" /> 复制失败用例
                </button>
                {aiHint && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs mt-2">
                    💡 {aiHint}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setPhase("minimized")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              收起 <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/editor/SubmitButton.tsx frontend/components/editor/SubmissionResult.tsx
git commit -m "feat: submit anti-mistouch + 4-phase verdict animation"
```

---

由于篇幅限制，计划在此处只展示前 5 个 Task 作为具体步骤的模板。剩余 Phase 2-8 的 Task 概要如下。完整计划文件将包含所有 Task 的完整代码和步骤。

### Task 6: 题库列表页重构（虚拟滚动 + 状态缓存）
### Task 7: 题目详情页重构（面板拖拽 + 四标签）
### Task 8: 评测 SSE 推送（替代轮询）
### Task 9: problem/repository 层实现
### Task 10: submission 模块实现
### Task 11: 题库导入脚本（import_problems.py）
### Task 12: 240 题 JSON 题库（第一批 60 题）
### Task 13: 题目管理后台页面
### Task 14: AI 服务后端（hint/analyze/chat + Prompt管理）
### Task 15: AI 悬浮助手前端
### Task 16: Canvas 渲染引擎 + 算法渲染器
### Task 17: 可视化帧生成器（Python 端）
### Task 18: 竞赛系统（CRUD + 排名）
### Task 19: 交互走查与微动画打磨
### Task 20: OpenTelemetry + Sentry + Grafana 集成
### Task 21: 安全加固（代码查重 + 细粒度限流 + 审计日志）
### Task 22: 测试与性能优化

---

> ⚠️ 注意：完整计划文档包含 Task 6-22 的全部可执行代码。由于上下文限制，请确认此计划结构后，我将按 Phase 逐个展开后续 Task 的完整详细实现步骤。
