from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, require_author_or_admin
from app.services import analytics_service
from app.utils.response import success

router = APIRouter()


@router.get("/dashboard")
async def dashboard_overview(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await analytics_service.dashboard_overview(db)
    return success(data=data)


@router.get("/analytics/users/{user_id}")
async def user_analytics(
    user_id: int,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await analytics_service.user_analytics(db, user_id)
    return success(data=data)


@router.get("/analytics/problems")
async def problem_analytics(
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await analytics_service.problem_analytics_list(db)
    return success(data=data)
