import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import settings
from app.exceptions import RateLimitError
from app.models.submission import Submission
from app.models.problem import Problem
from app.judge.security import compute_code_hash, verify_hmac
from app.shared.sse import sse_manager

logger = logging.getLogger("algohub.judge")


async def create_submission(
    db: AsyncSession,
    user_id: int,
    problem_id: int,
    language: str,
    code: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    contest_id: int | None = None,
) -> Submission:
    # Submission cooldown: reject duplicate submissions (same user + problem + language)
    # within 30 seconds to prevent accidental duplicate submissions and abuse.
    recent = await db.execute(
        select(Submission)
        .where(
            Submission.user_id == user_id,
            Submission.problem_id == problem_id,
            Submission.language == language,
            Submission.created_at >= datetime.now(timezone.utc) - timedelta(seconds=30),
        )
        .order_by(desc(Submission.created_at))
        .limit(1)
    )
    if recent.scalar_one_or_none():
        raise RateLimitError(30)

    problem = await db.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")

    submission = Submission(
        user_id=user_id,
        problem_id=problem_id,
        contest_id=contest_id,
        language=language,
        code=code,
        code_hash=compute_code_hash(code),
        ip_address=ip_address,
        user_agent=user_agent,
        status="Pending",
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # Send to Celery
    from celery_app.tasks.judge_tasks import run_judge

    run_judge.delay(
        submission_id=submission.id,
        code=code,
        language=language,
        test_cases=problem.hidden_cases,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
    )

    # Notify SSE subscribers that the judge has been queued
    try:
        await sse_manager.publish(
            submission_id=submission.id,
            event_type="judge_queued",
            data={"status": "Pending"},
        )
    except Exception:
        logger.warning("Failed to publish SSE queued event", exc_info=True)

    return submission


async def process_judge_callback(db: AsyncSession, payload: dict, signature: str) -> Submission:
    if not verify_hmac(payload, signature):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="签名验证失败")

    submission = await db.get(Submission, payload["submission_id"])
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    submission.status = payload["status"]
    submission.execution_time = payload.get("execution_time")
    submission.execution_memory = payload.get("execution_memory")
    submission.score = payload.get("score", 0)
    submission.error_message = payload.get("error_message")
    submission.judge_log = payload.get("judge_log")

    await db.commit()
    await db.refresh(submission)
    return submission


async def get_submission(db: AsyncSession, submission_id: int, user_id: int | None = None) -> Submission:
    query = select(Submission).where(Submission.id == submission_id)
    if user_id:
        query = query.where(Submission.user_id == user_id)
    result = await db.execute(query)
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")
    return submission


async def list_submissions(
    db: AsyncSession,
    problem_id: int | None = None,
    user_id: int | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Submission], int]:
    query = select(Submission)
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)
    if user_id:
        query = query.where(Submission.user_id == user_id)
    if status_filter:
        query = query.where(Submission.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Submission.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    submissions = (await db.execute(query)).scalars().all()

    return list(submissions), total
