from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.modules.submission.models import Submission


class SubmissionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, submission: Submission) -> Submission:
        self.db.add(submission)
        await self.db.flush()
        return submission

    async def get_by_id(self, submission_id: int):
        return await self.db.get(Submission, submission_id)

    async def list_by_problem(self, problem_id: int, *, skip=0, limit=20, status=None):
        stmt = select(Submission).where(Submission.problem_id == problem_id)
        if status:
            stmt = stmt.where(Submission.status == status)
        stmt = stmt.order_by(desc(Submission.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_by_user(self, user_id: int, *, skip=0, limit=20):
        stmt = select(Submission).where(Submission.user_id == user_id).order_by(desc(Submission.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update(self, submission: Submission, **values) -> Submission:
        for k, v in values.items():
            if hasattr(submission, k) and v is not None:
                setattr(submission, k, v)
        await self.db.flush()
        return submission
