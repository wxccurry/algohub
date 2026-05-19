from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_from_token
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserProfileUpdate, UserWithProfile
from app.services import auth_service
from app.utils.response import error, success

router = APIRouter()


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.register_user(db, req.username, req.email, req.password)
    return success(data=user, message="注册成功", code=201)


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.login_user(db, req.username, req.password)
    return success(data=tokens, message="登录成功")


@router.post("/refresh")
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh_access_token(db, req.refresh_token)
    return success(data=tokens, message="令牌已刷新")


@router.post("/logout")
async def logout(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout_user(db, req.refresh_token)
    return success(message="已登出")


def _format_profile(profile) -> dict:
    privacy = profile.privacy_settings or {}
    return {
        "nickname": profile.nickname,
        "avatar": profile.avatar,
        "gender": profile.gender,
        "gender_label": {0: "未知", 1: "男", 2: "女"}.get(profile.gender, "未知"),
        "bio": profile.bio,
        "preferred_languages": profile.preferred_languages,
        "github_url": profile.github_url,
        "blog_url": profile.blog_url,
        "current_status": profile.current_status,
        "current_status_label": {1: "在校生", 2: "在职-看机会", 3: "在职-不看机会"}.get(
            profile.current_status, "在校生"
        ),
        "school": profile.school,
        "major": profile.major,
        "organization": profile.organization,
        "region_code": profile.region_code,
        "solved_count": profile.solved_count,
        "rating": profile.rating,
        "streak_days": profile.streak_days,
        "privacy_settings": privacy,
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user_from_token), db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user(db, current_user["user_id"])
    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": _format_profile(user.profile) if user.profile else None,
    }
    return success(data=data)


@router.put("/me")
async def update_me(
    req: UserProfileUpdate,
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    profile = await auth_service.update_user_profile(
        db, current_user["user_id"], req.model_dump(exclude_unset=True)
    )
    return success(data=_format_profile(profile), message="资料已更新")
