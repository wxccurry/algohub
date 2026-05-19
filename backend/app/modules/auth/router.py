from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.modules.auth.service import AuthService
from app.shared.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register(req.username, req.email, req.password)
    return {
        "code": 201,
        "message": "注册成功",
        "data": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    tokens = await service.login(req.username, req.password)
    return {"code": 200, "message": "登录成功", "data": TokenResponse(**tokens).model_dump()}


@router.post("/refresh")
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    tokens = await service.refresh(req.refresh_token)
    return {"code": 200, "message": "令牌已刷新", "data": TokenResponse(**tokens).model_dump()}


@router.post("/logout")
async def logout(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.logout(req.refresh_token)
    return {"code": 200, "message": "已登出", "data": None}


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
        "max_streak": profile.max_streak,
        "contribution": profile.contribution,
        "privacy_settings": privacy,
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.get_me(current_user.id)
    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": _format_profile(user.profile) if user.profile else None,
    }
    return {"code": 200, "message": "ok", "data": data}


@router.put("/me")
async def update_me(
    req: "ProfileUpdateRequest",
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.auth.schemas import ProfileUpdateRequest

    service = AuthService(db)
    profile = await service.update_profile(
        current_user.id, req.model_dump(exclude_unset=True)
    )
    return {"code": 200, "message": "资料已更新", "data": _format_profile(profile)}
