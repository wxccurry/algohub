import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User, UserProfile
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.utils.redis import blacklist_refresh_token, is_refresh_token_blacklisted


async def register_user(db: AsyncSession, username: str, email: str, password: str) -> dict:
    existing = await db.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名或邮箱已存在")

    user = User(username=username, email=email, password_hash=hash_password(password))
    db.add(user)
    await db.flush()

    profile = UserProfile(user_id=user.id)
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role}


async def login_user(db: AsyncSession, username: str, password: str) -> dict:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账户已被禁用")

    access_token = create_access_token(user.id, user.role)
    refresh_token, jti, exp = create_refresh_token(user.id, user.role)

    # No DB insert — refresh token is valid by default (signed JWT).
    # Only blacklisted JTIs (via logout) are rejected.

    profile = await db.get(UserProfile, user.id)
    if profile:
        profile.last_login_at = datetime.now(timezone.utc)

    await db.commit()
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict:
    payload = decode_token(refresh_token_str)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")

    jti = payload.get("jti")
    if await is_refresh_token_blacklisted(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌已失效")

    user_id = payload["user_id"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已禁用")

    # Blacklist the old refresh token (rotate)
    exp = payload.get("exp", 0)
    now_ts = int(time.time())
    remaining_ttl = max(exp - now_ts, 1)
    await blacklist_refresh_token(jti, remaining_ttl)

    # Issue new pair
    new_access = create_access_token(user.id, user.role)
    new_refresh, new_jti, new_exp = create_refresh_token(user.id, user.role)

    await db.commit()
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


async def logout_user(db: AsyncSession, refresh_token_str: str) -> None:
    payload = decode_token(refresh_token_str)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")

    jti = payload.get("jti")
    exp = payload.get("exp", 0)
    now_ts = int(time.time())
    remaining_ttl = max(exp - now_ts, 1)
    await blacklist_refresh_token(jti, remaining_ttl)


async def get_user(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user


async def update_user_profile(db: AsyncSession, user_id: int, data: dict) -> UserProfile:
    profile = await db.get(UserProfile, user_id)
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)

    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    return profile
