from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.models.submission import Submission
from app.models.problem import Problem


async def dashboard_overview(db: AsyncSession) -> dict:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_problems = (await db.execute(select(func.count(Problem.id)))).scalar() or 0
    total_submissions = (await db.execute(select(func.count(Submission.id)))).scalar() or 0

    today_active = (await db.execute(
        select(func.count(func.distinct(Submission.user_id)))
        .where(Submission.created_at >= today)
    )).scalar() or 0

    ac_count = (await db.execute(
        select(func.count(Submission.id)).where(Submission.status == "AC")
    )).scalar() or 0

    ac_rate = round(ac_count / total_submissions * 100, 1) if total_submissions > 0 else 0

    return {
        "total_users": total_users,
        "total_problems": total_problems,
        "total_submissions": total_submissions,
        "today_active_users": today_active,
        "overall_ac_rate": ac_rate,
    }


async def user_analytics(db: AsyncSession, user_id: int) -> dict:
    user = await db.get(User, user_id)
    if not user:
        return {}

    total_subs = (await db.execute(
        select(func.count(Submission.id)).where(Submission.user_id == user_id)
    )).scalar() or 0

    ac_count = (await db.execute(
        select(func.count(Submission.id)).where(
            Submission.user_id == user_id, Submission.status == "AC"
        )
    )).scalar() or 0

    solved = (await db.execute(
        select(func.count(func.distinct(Submission.problem_id)))
        .where(Submission.user_id == user_id, Submission.status == "AC")
    )).scalar() or 0

    profile = await db.get(UserProfile, user_id)

    return {
        "user_id": user_id,
        "username": user.username,
        "total_submissions": total_subs,
        "ac_count": ac_count,
        "ac_rate": round(ac_count / total_subs * 100, 1) if total_subs > 0 else 0,
        "solved_problems": solved,
        "streak_days": profile.streak_days if profile else 0,
        "rating": profile.rating if profile else 1500,
    }


async def problem_analytics_list(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Problem).order_by(Problem.id))
    problems = result.scalars().all()
    data = []
    for p in problems:
        total = (await db.execute(
            select(func.count(Submission.id)).where(Submission.problem_id == p.id)
        )).scalar() or 0
        ac = (await db.execute(
            select(func.count(Submission.id)).where(
                Submission.problem_id == p.id, Submission.status == "AC"
            )
        )).scalar() or 0
        data.append({
            "problem_id": p.id,
            "title": p.title,
            "difficulty": p.difficulty,
            "total_submissions": total,
            "ac_count": ac,
            "ac_rate": round(ac / total * 100, 1) if total > 0 else 0,
        })
    return data
