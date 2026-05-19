from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.modules.problem.models import Problem, ProblemTag, ProblemSolution, ProblemTestCase


class ProblemRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_problems(
        self, *, skip=0, limit=20, difficulty=None, tag=None, search=None, user_id=None
    ):
        stmt = select(Problem).where(Problem.is_public == True)
        if difficulty:
            stmt = stmt.where(Problem.difficulty == difficulty)
        if tag:
            stmt = stmt.join(Problem.tags).where(ProblemTag.tag_name == tag)
        if search:
            stmt = stmt.where(
                or_(Problem.title.ilike(f"%{search}%"), Problem.slug.ilike(f"%{search}%"))
            )
        stmt = stmt.order_by(Problem.id).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_problems_with_tags(
        self, *, skip=0, limit=20, difficulty=None, tag=None, search=None
    ):
        """List problems with eagerly loaded tags -- used by service for list view."""
        stmt = (
            select(Problem)
            .options(selectinload(Problem.tags))
            .where(Problem.is_public == True)
        )
        if difficulty:
            stmt = stmt.where(Problem.difficulty == difficulty)
        if tag:
            stmt = stmt.where(Problem.tags.any(ProblemTag.tag_name == tag))
        if search:
            ilike = f"%{search}%"
            stmt = stmt.where(
                or_(Problem.title.ilike(ilike), Problem.description.ilike(ilike))
            )
        stmt = stmt.order_by(Problem.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_problems(self, *, difficulty=None, tag=None, search=None):
        stmt = select(func.count()).select_from(Problem).where(Problem.is_public == True)
        if difficulty:
            stmt = stmt.where(Problem.difficulty == difficulty)
        if tag:
            stmt = stmt.join(Problem.tags).where(ProblemTag.tag_name == tag)
        if search:
            stmt = stmt.where(
                or_(Problem.title.ilike(f"%{search}%"), Problem.slug.ilike(f"%{search}%"))
            )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_by_id(self, problem_id: int):
        result = await self.db.execute(
            select(Problem)
            .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
            .where(Problem.id == problem_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str):
        result = await self.db.execute(select(Problem).where(Problem.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, problem: Problem) -> Problem:
        self.db.add(problem)
        await self.db.flush()
        return problem

    async def update(self, problem: Problem, **values) -> Problem:
        for k, v in values.items():
            if hasattr(problem, k) and v is not None:
                setattr(problem, k, v)
        await self.db.flush()
        return problem

    async def delete(self, problem: Problem):
        await self.db.delete(problem)
        await self.db.flush()

    async def get_tags(self, problem_id: int):
        result = await self.db.execute(
            select(ProblemTag).where(ProblemTag.problem_id == problem_id)
        )
        return result.scalars().all()

    async def get_solutions(self, problem_id: int, skip=0, limit=20):
        result = await self.db.execute(
            select(ProblemSolution)
            .where(ProblemSolution.problem_id == problem_id)
            .order_by(ProblemSolution.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def add_tag(self, tag: ProblemTag):
        self.db.add(tag)

    async def delete_tag(self, tag: ProblemTag):
        await self.db.delete(tag)

    async def add_test_case(self, test_case: ProblemTestCase):
        self.db.add(test_case)
