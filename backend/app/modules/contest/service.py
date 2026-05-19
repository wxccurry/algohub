from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.exceptions import NotFoundError, ConflictError, ForbiddenError
from app.modules.contest.models import Contest, ContestParticipant, ContestProblem
from app.modules.auth.models import User


class ContestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_contests(self, skip=0, limit=20):
        result = await self.db.execute(
            select(Contest).order_by(desc(Contest.start_time)).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_contest(self, contest_id: int):
        contest = await self.db.get(Contest, contest_id)
        if not contest:
            raise NotFoundError("Contest", contest_id)
        return contest

    async def create_contest(self, data, author_id: int):
        contest = Contest(**data.model_dump(), author_id=author_id)
        self.db.add(contest)
        await self.db.commit()
        await self.db.refresh(contest)
        return contest

    async def register(self, contest_id: int, user_id: int):
        contest = await self.get_contest(contest_id)
        existing = await self.db.execute(
            select(ContestParticipant).where(
                ContestParticipant.contest_id == contest_id,
                ContestParticipant.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError("Already registered")
        participant = ContestParticipant(contest_id=contest_id, user_id=user_id)
        self.db.add(participant)
        await self.db.flush()
        return participant

    async def get_ranking(self, contest_id: int):
        await self.get_contest(contest_id)
        result = await self.db.execute(
            select(ContestParticipant)
            .where(ContestParticipant.contest_id == contest_id)
            .order_by(desc(ContestParticipant.score), ContestParticipant.penalty)
        )
        participants = result.scalars().all()
        ranking = []
        for i, p in enumerate(participants):
            user_result = await self.db.execute(select(User).where(User.id == p.user_id))
            user = user_result.scalar_one_or_none()
            ranking.append({
                "rank": i + 1,
                "user_id": p.user_id,
                "username": user.username if user else "unknown",
                "score": p.score,
                "penalty": p.penalty,
            })
        return ranking

    async def add_problem(self, contest_id: int, problem_id: int, display_id: str, points: int = 100):
        cp = ContestProblem(
            contest_id=contest_id,
            problem_id=problem_id,
            display_id=display_id,
            points=points,
            sort_order=ord(display_id[0]) - ord('A') if display_id else 0,
        )
        self.db.add(cp)
        await self.db.flush()
        return cp
