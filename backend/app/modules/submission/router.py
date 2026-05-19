from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_from_token
from app.modules.submission.service import SubmissionService
from app.shared.database import get_db
from app.utils.response import success

router = APIRouter(prefix="/api", tags=["提交"])


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    service = SubmissionService(db)
    submission = await service.get_submission(submission_id, user_id=current_user["user_id"])
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
    service = SubmissionService(db)
    skip = (page - 1) * page_size
    submissions = await service.list_for_problem(
        problem_id, skip=skip, limit=page_size, status=status_filter,
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
    return success(data={"items": items, "page": page, "page_size": page_size})
