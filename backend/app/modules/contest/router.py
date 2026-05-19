from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.dependencies.auth import get_current_user, require_login
from app.modules.contest.service import ContestService
from app.modules.contest.schemas import ContestCreate

router = APIRouter(prefix="/api/v1/contests", tags=["contests"])


@router.get("/")
async def list_contests(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    svc = ContestService(db)
    contests = await svc.list_contests(skip=skip, limit=limit)
    return {
        "code": 200,
        "message": "ok",
        "data": [
            {
                "id": c.id,
                "title": c.title,
                "start_time": str(c.start_time),
                "end_time": str(c.end_time),
                "rule_type": c.rule_type,
            }
            for c in contests
        ],
    }


@router.get("/{contest_id}")
async def get_contest(contest_id: int, db: AsyncSession = Depends(get_db)):
    svc = ContestService(db)
    contest = await svc.get_contest(contest_id)
    return {
        "code": 200,
        "message": "ok",
        "data": {
            "id": contest.id,
            "title": contest.title,
            "description": contest.description,
            "start_time": str(contest.start_time),
            "end_time": str(contest.end_time),
            "rule_type": contest.rule_type,
        },
    }


@router.post("/")
async def create_contest(
    req: ContestCreate,
    current_user=Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    svc = ContestService(db)
    contest = await svc.create_contest(req, current_user.id)
    return {"code": 201, "message": "ok", "data": {"id": contest.id}}


@router.post("/{contest_id}/register")
async def register_contest(
    contest_id: int,
    current_user=Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    svc = ContestService(db)
    await svc.register(contest_id, current_user.id)
    return {"code": 200, "message": "registered"}


@router.get("/{contest_id}/ranking")
async def get_ranking(contest_id: int, db: AsyncSession = Depends(get_db)):
    svc = ContestService(db)
    ranking = await svc.get_ranking(contest_id)
    return {"code": 200, "message": "ok", "data": ranking}
