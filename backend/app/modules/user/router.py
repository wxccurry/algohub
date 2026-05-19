from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User, UserProfile
from app.shared.database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/id/{user_id}")
async def get_user_by_id(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return {"code": 404, "message": "用户不存在", "data": None}
    return {"code": 200, "message": "ok", "data": {"id": user.id, "username": user.username}}


@router.get("/{username}/checkins")
async def get_user_checkins(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        return {"code": 404, "message": "用户不存在", "data": None}
    from sqlalchemy import text as sa_text
    checkin_result = await db.execute(
        sa_text("SELECT checkin_date, problem_count FROM user_checkins WHERE user_id = :uid ORDER BY checkin_date DESC LIMIT 366"),
        {"uid": user.id}
    )
    checkins = {str(row[0]): row[1] for row in checkin_result}
    return {"code": 200, "message": "ok", "data": {"checkins": checkins}}


@router.get("/{username}")
async def get_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.username == username)
    )
    user = result.scalar_one_or_none()
    if not user:
        return {"code": 404, "message": "用户不存在", "data": None}

    p = user.profile
    profile_data = None
    if p:
        profile_data = {
            "nickname": p.nickname,
            "avatar": p.avatar,
            "gender": p.gender,
            "bio": p.bio,
            "school": p.school,
            "major": p.major,
            "organization": p.organization,
            "github_url": p.github_url,
            "blog_url": p.blog_url,
            "preferred_languages": p.preferred_languages,
            "current_status": p.current_status,
            "region_code": p.region_code,
            "solved_count": p.solved_count,
            "rating": p.rating,
            "streak_days": p.streak_days,
            "max_streak": p.max_streak,
            "contribution": p.contribution,
            "privacy_settings": p.privacy_settings,
        }

    return {
        "code": 200,
        "message": "ok",
        "data": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "profile": profile_data,
        },
    }
