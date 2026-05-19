import logging

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.submission import JudgeCallbackPayload
from app.judge import judge_service
from app.utils.response import success
from app.shared.sse import sse_manager

logger = logging.getLogger("algohub.judge")

router = APIRouter()


@router.post("/judge/callback")
async def judge_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_judge_signature: str = Header(..., alias="X-Judge-Signature"),
):
    body = await request.json()
    payload = JudgeCallbackPayload(**body)
    submission = await judge_service.process_judge_callback(
        db,
        {**payload.model_dump(), "timestamp": body.get("timestamp", 0)},
        x_judge_signature,
    )

    # Publish SSE events to real-time subscribers
    try:
        FINAL_STATUSES = {"AC", "WA", "TLE", "MLE", "RE", "CE", "SE"}
        event_type = "judge_complete" if submission.status in FINAL_STATUSES else "judge_progress"
        await sse_manager.publish(
            submission_id=submission.id,
            event_type=event_type,
            data={
                "status": submission.status,
                "execution_time": submission.execution_time,
                "execution_memory": submission.execution_memory,
                "current_case": body.get("current_case"),
                "total_cases": body.get("total_cases"),
                "score": submission.score,
            },
        )
    except Exception:
        logger.warning("Failed to publish SSE event", exc_info=True)

    return success(
        data={"submission_id": submission.id, "status": submission.status},
        message="评测结果已记录",
    )
