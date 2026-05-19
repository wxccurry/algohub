from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_from_token
from app.dependencies.auth import require_login
from app.modules.submission.service import SubmissionService
from app.modules.submission.schemas import RunCodeRequest, SubmitRequest
from app.shared.database import get_db
from app.shared.sse import sse_manager
from app.utils.response import success
from app.judge import judge_service

router = APIRouter(prefix="/api", tags=["提交"])


def _get_user_id(user) -> int:
    if hasattr(user, "id"):
        return user.id
    return user["user_id"]


@router.post("/problems/{problem_id}/submit")
async def submit_code(
    problem_id: int,
    req: SubmitRequest,
    request: Request,
    current_user = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    submission = await judge_service.create_submission(
        db,
        user_id=_get_user_id(current_user),
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


@router.post("/problems/{problem_id}/run")
async def run_code(
    problem_id: int,
    req: RunCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run user code against sample test cases only — no submission created."""
    from app.modules.problem.service import ProblemService

    problem_svc = ProblemService(db)
    problem = await problem_svc.get_problem(problem_id)
    sample_cases = problem.get("sample_cases", [])

    if not sample_cases:
        return success(data={"message": "本题无示例用例"}, message="ok")

    from celery_app.tasks.judge_tasks import _judge_python_subprocess

    results = _judge_python_subprocess(req.code, sample_cases, problem.get("time_limit", 5000))

    passed = all(r["status"] == "AC" for r in results)
    return success(data={
        "passed": passed,
        "total": len(results),
        "results": [
            {
                "case": r["case"],
                "status": r["status"],
                "expected": r.get("expected", ""),
                "actual": r.get("actual", ""),
                "message": r.get("message", ""),
            }
            for r in results
        ],
    })


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    current_user = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    submission = await judge_service.get_submission(db, submission_id, user_id=_get_user_id(current_user))
    data = {
        "id": submission.id, "user_id": submission.user_id,
        "problem_id": submission.problem_id, "contest_id": submission.contest_id,
        "language": submission.language, "code": submission.code,
        "status": submission.status,
        "execution_time": submission.execution_time,
        "execution_memory": submission.execution_memory,
        "score": submission.score, "error_message": submission.error_message,
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
            "id": s.id, "user_id": s.user_id, "problem_id": s.problem_id,
            "language": s.language, "status": s.status,
            "execution_time": s.execution_time, "execution_memory": s.execution_memory,
            "score": s.score, "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in submissions
    ]
    return success(data={"items": items, "total": total, "page": page, "page_size": page_size})


@router.get("/submissions/{submission_id}/stream")
async def stream_submission(submission_id: int):
    """SSE endpoint for real-time submission status updates."""
    return StreamingResponse(
        sse_manager.stream(submission_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/user/submissions")
async def list_my_submissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's submission history."""
    service = SubmissionService(db)
    submissions = await service.list_for_user(
        _get_user_id(current_user), skip=(page - 1) * page_size, limit=page_size,
    )
    items = [
        {
            "id": s.id, "problem_id": s.problem_id, "language": s.language,
            "status": s.status, "execution_time": s.execution_time,
            "execution_memory": s.execution_memory, "score": s.score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in submissions
    ]
    return success(data={"items": items, "page": page, "page_size": page_size})
