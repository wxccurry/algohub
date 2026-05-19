import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.modules.auth.models import User, UserProfile
from app.shared.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.utils.redis import blacklist_refresh_token, is_refresh_token_blacklisted


class AuthService:
    """Authentication and user profile service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # register
    # ------------------------------------------------------------------

    async def register(self, username: str, email: str, password: str) -> User:
        existing = await self.db.execute(
            select(User).where((User.username == username) | (User.email == email))
        )
        if existing.scalar_one_or_none():
            raise ConflictError("用户名或邮箱已存在")

        user = User(username=username, email=email, password_hash=hash_password(password))
        self.db.add(user)
        await self.db.flush()

        profile = UserProfile(user_id=user.id)
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ------------------------------------------------------------------
    # login
    # ------------------------------------------------------------------

    async def login(self, username: str, password: str) -> dict:
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("用户名或密码错误")
        if not user.is_active:
            raise ForbiddenError("账户已被禁用")

        access_token = create_access_token(user.id, user.role)
        refresh_token, _jti, _exp = create_refresh_token(user.id, user.role)

        profile = await self.db.get(UserProfile, user.id)
        if profile:
            profile.last_login_at = datetime.now(timezone.utc)

        await self.db.commit()
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

    # ------------------------------------------------------------------
    # refresh
    # ------------------------------------------------------------------

    async def refresh(self, refresh_token_str: str) -> dict:
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("令牌类型错误")

        jti = payload.get("jti")
        if await is_refresh_token_blacklisted(jti):
            raise UnauthorizedError("令牌已失效")

        user_id = payload["user_id"]
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise UnauthorizedError("用户不存在或已禁用")

        # Blacklist the old refresh token (rotate)
        exp = payload.get("exp", 0)
        now_ts = int(time.time())
        remaining_ttl = max(exp - now_ts, 1)
        await blacklist_refresh_token(jti, remaining_ttl)

        # Issue new pair
        new_access = create_access_token(user.id, user.role)
        new_refresh, _new_jti, _new_exp = create_refresh_token(user.id, user.role)

        await self.db.commit()
        return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

    # ------------------------------------------------------------------
    # logout
    # ------------------------------------------------------------------

    async def logout(self, refresh_token_str: str) -> None:
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("令牌类型错误")

        jti = payload.get("jti")
        exp = payload.get("exp", 0)
        now_ts = int(time.time())
        remaining_ttl = max(exp - now_ts, 1)
        await blacklist_refresh_token(jti, remaining_ttl)

    # ------------------------------------------------------------------
    # get_me
    # ------------------------------------------------------------------

    async def get_me(self, user_id: int) -> User:
        result = await self.db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)
        return user

    # ------------------------------------------------------------------
    # update_profile
    # ------------------------------------------------------------------

    async def update_profile(self, user_id: int, data: dict) -> UserProfile:
        profile = await self.db.get(UserProfile, user_id)
        if not profile:
            profile = UserProfile(user_id=user_id)
            self.db.add(profile)

        for key, value in data.items():
            if value is not None:
                setattr(profile, key, value)

        await self.db.commit()
        await self.db.refresh(profile)
        return profile
