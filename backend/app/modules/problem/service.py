from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError, ForbiddenError
from app.modules.problem.repository import ProblemRepository
from app.modules.problem.models import Problem, ProblemTag, ProblemTestCase


class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProblemRepository(db)

    async def list_problems(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        difficulty: str | None = None,
        tag: str | None = None,
        search: str | None = None,
    ):
        skip = (page - 1) * page_size
        problems = await self.repo.list_problems_with_tags(
            skip=skip,
            limit=page_size,
            difficulty=difficulty,
            tag=tag,
            search=search,
        )
        total = await self.repo.count_problems(
            difficulty=difficulty,
            tag=tag,
            search=search,
        )

        results = []
        for p in problems:
            results.append({
                "id": p.id,
                "title": p.title,
                "difficulty": p.difficulty,
                "difficulty_score": p.difficulty_score,
                "tags": [t.tag_name for t in p.tags],
                "source": p.source,
                "is_public": p.is_public,
                "version": p.version,
                "created_at": p.created_at,
            })

        return results, total

    async def get_problem(self, problem_id: int, is_admin: bool = False):
        problem = await self.repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        if not problem.is_public and not is_admin:
            raise ForbiddenError("Problem is not public")

        # Only return sample test cases -- hidden cases stripped
        sample_tc_out = [
            {
                "id": tc.id,
                "is_sample": tc.is_sample,
                "subtask_id": tc.subtask_id,
                "points": tc.points,
                "description": tc.description,
            }
            for tc in (problem.test_cases or [])
            if tc.is_sample
        ]

        return {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "input_format": problem.input_format,
            "output_format": problem.output_format,
            "sample_cases": problem.sample_cases,
            "difficulty": problem.difficulty,
            "difficulty_score": problem.difficulty_score,
            "time_limit": problem.time_limit,
            "memory_limit": problem.memory_limit,
            "source": problem.source,
            "is_public": problem.is_public,
            "version": problem.version,
            "tags": [t.tag_name for t in problem.tags],
            "test_cases": sample_tc_out,
            "sample_count": len(problem.sample_cases or []),
            "hidden_count": len(problem.hidden_cases or []),
            "author_id": problem.author_id,
            "created_at": problem.created_at,
            "updated_at": problem.updated_at,
        }

    async def create_problem(self, data, author_id: int):
        """Create a problem with tags and test cases."""
        data_dict = data.model_dump() if hasattr(data, "model_dump") else dict(data)
        tags = data_dict.pop("tags", [])
        test_cases_data = data_dict.pop("test_cases", [])

        problem = Problem(**data_dict, author_id=author_id)
        problem = await self.repo.create(problem)

        for tag_name in tags:
            await self.repo.add_tag(ProblemTag(problem_id=problem.id, tag_name=tag_name.strip()))

        for tc in test_cases_data:
            tc_dict = tc.model_dump() if hasattr(tc, "model_dump") else tc
            await self.repo.add_test_case(ProblemTestCase(problem_id=problem.id, **tc_dict))

        await self.db.commit()
        await self.db.refresh(problem)
        return problem

    async def update_problem(self, problem_id: int, data, user) -> Problem:
        problem = await self.repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        if problem.author_id != user["user_id"] and user.get("role") != "admin":
            raise ForbiddenError("Only the author or admin can edit")

        data_dict = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else data
        tags = data_dict.pop("tags", None)

        # Update scalar fields
        for key, value in data_dict.items():
            if value is not None:
                setattr(problem, key, value)

        # Replace tags if provided
        if tags is not None:
            for existing_tag in list(problem.tags):
                await self.repo.delete_tag(existing_tag)
            for tag_name in tags:
                await self.repo.add_tag(
                    ProblemTag(problem_id=problem.id, tag_name=tag_name.strip())
                )

        problem.version += 1
        await self.db.commit()
        await self.db.refresh(problem)
        return problem

    async def delete_problem(self, problem_id: int, user):
        problem = await self.repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        if problem.author_id != user["user_id"] and user.get("role") != "admin":
            raise ForbiddenError()
        await self.repo.delete(problem)
        await self.db.commit()

    async def get_solutions(self, problem_id: int, page: int = 1, page_size: int = 20):
        skip = (page - 1) * page_size
        solutions = await self.repo.get_solutions(problem_id, skip=skip, limit=page_size)
        return solutions

    async def create_solution(self, problem_id: int, data, author_id: int):
        from app.modules.problem.models import ProblemSolution

        solution = ProblemSolution(
            problem_id=problem_id,
            author_id=author_id,
            content=data.content,
            language=data.language,
        )
        self.db.add(solution)
        await self.db.commit()
        await self.db.refresh(solution)
        return solution
