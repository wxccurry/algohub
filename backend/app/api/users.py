from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserProfile
from app.utils.response import success

router = APIRouter()


@router.get("/{username}")
async def get_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.username == username)
    )
    user = result.scalar_one_or_none()
    if not user:
        return success(data=None, message="用户不存在", code=404)

    p = user.profile
    return success(data={
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": {
            "nickname": p.nickname if p else None,
            "avatar": p.avatar if p else None,
            "gender": p.gender if p else 0,
            "bio": p.bio if p else None,
            "school": p.school if p else None,
            "major": p.major if p else None,
            "organization": p.organization if p else None,
            "github_url": p.github_url if p else None,
            "blog_url": p.blog_url if p else None,
            "preferred_languages": p.preferred_languages if p else None,
            "current_status": p.current_status if p else 1,
            "region_code": p.region_code if p else None,
            "solved_count": p.solved_count if p else 0,
            "rating": p.rating if p else 1500,
            "streak_days": p.streak_days if p else 0,
            "privacy_settings": p.privacy_settings if p else {},
        } if p else None,
    })
