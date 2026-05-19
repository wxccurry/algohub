from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.security import decode_token


async def get_current_user_from_token(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="认证格式错误")

    token = authorization.removeprefix("Bearer ")
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌类型错误")

    return {"user_id": payload["user_id"], "role": payload["role"]}


def require_role(*roles: str):
    async def checker(current_user: dict = Depends(get_current_user_from_token)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="权限不足")
        return current_user

    return checker


# Pre-built common permission dependencies
require_login = require_role("user", "author", "admin")
require_author_or_admin = require_role("author", "admin")
require_admin = require_role("admin")
