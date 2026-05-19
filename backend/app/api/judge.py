import logging

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.submission import JudgeCallbackPayload
from app.judge import judge_service
from app.utils.response import success

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
    return success(
        data={"submission_id": submission.id, "status": submission.status},
        message="评测结果已记录",
    )
