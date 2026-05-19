from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ForbiddenError, UnauthorizedError
from app.modules.auth.models import User
from app.shared.database import get_db
from app.shared.security import decode_token


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode Bearer token and fetch the corresponding User from DB."""
    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("认证格式错误")

    token = authorization.removeprefix("Bearer ")
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise UnauthorizedError("令牌类型错误")

    result = await db.execute(select(User).where(User.id == payload["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("用户不存在或已禁用")
    if not user.is_active:
        raise ForbiddenError("账户已被禁用")
    return user


def require_role(*roles: str):
    """Factory returning a dependency that checks the current user's role."""

    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenError("权限不足")
        return current_user

    return checker


# Pre-built common permission dependencies
require_login = require_role("user", "author", "admin")
require_author_or_admin = require_role("author", "admin")
require_admin = require_role("admin")
