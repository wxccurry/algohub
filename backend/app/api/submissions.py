from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.dependencies import get_current_user_from_token, require_login
from app.schemas.submission import SubmitRequest
from app.judge import judge_service
from app.utils.response import success

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/problems/{problem_id}/submit")
@limiter.limit("5/minute")
async def submit_code(
    problem_id: int,
    req: SubmitRequest,
    request: Request,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    submission = await judge_service.create_submission(
        db,
        user_id=current_user["user_id"],
        problem_id=problem_id,
        language=req.language,
        code=req.code,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return success(
        data={"submission_id": submission.id, "status": submission.status},
        message="提交成功，正在评测",
        code=201,
    )


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    submission = await judge_service.get_submission(db, submission_id, user_id=current_user["user_id"])
    data = {
        "id": submission.id,
        "user_id": submission.user_id,
        "problem_id": submission.problem_id,
        "contest_id": submission.contest_id,
        "language": submission.language,
        "code": submission.code,
        "status": submission.status,
        "execution_time": submission.execution_time,
        "execution_memory": submission.execution_memory,
        "score": submission.score,
        "error_message": submission.error_message,
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
    }
    return success(data=data)


@router.get("/problems/{problem_id}/submissions")
async def list_submissions(
    problem_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    submissions, total = await judge_service.list_submissions(
        db, problem_id=problem_id, status_filter=status_filter, page=page, page_size=page_size,
    )
    items = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "problem_id": s.problem_id,
            "language": s.language,
            "status": s.status,
            "execution_time": s.execution_time,
            "execution_memory": s.execution_memory,
            "score": s.score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in submissions
    ]
    return success(data={"items": items, "total": total, "page": page, "page_size": page_size})
