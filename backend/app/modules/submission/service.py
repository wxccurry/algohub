from sqlalchemy.ext.asyncio import AsyncSession
from app.exceptions import NotFoundError, ForbiddenError, RateLimitError
from app.modules.submission.repository import SubmissionRepository
from app.modules.submission.models import Submission


class SubmissionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SubmissionRepository(db)

    async def get_submission(self, submission_id: int, user_id: int) -> Submission:
        submission = await self.repo.get_by_id(submission_id)
        if not submission:
            raise NotFoundError("Submission", submission_id)
        if submission.user_id != user_id:
            raise ForbiddenError("Can only view your own submissions")
        return submission

    async def list_for_problem(self, problem_id: int, **filters):
        return await self.repo.list_by_problem(problem_id, **filters)

    async def list_for_user(self, user_id: int, **filters):
        return await self.repo.list_by_user(user_id, **filters)
