from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.problem import Problem, ProblemTag, ProblemSolution, ProblemTestCase


async def list_problems(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    difficulty: str | None = None,
    tag: str | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = select(Problem).options(selectinload(Problem.tags)).where(Problem.is_public == True)

    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if tag:
        query = query.where(Problem.tags.any(ProblemTag.tag_name == tag))
    if search:
        ilike = f"%{search}%"
        query = query.where(
            or_(Problem.title.ilike(ilike), Problem.description.ilike(ilike))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Problem.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    problems = (await db.execute(query)).scalars().all()

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


async def get_problem(db: AsyncSession, problem_id: int) -> dict:
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")

    # Only return sample test cases — hidden cases stripped
    sample_tc_out = [
        {"id": tc.id, "is_sample": tc.is_sample, "subtask_id": tc.subtask_id,
         "points": tc.points, "description": tc.description}
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


async def create_problem(db: AsyncSession, data: dict, author_id: int) -> Problem:
    tags = data.pop("tags", [])
    test_cases_data = data.pop("test_cases", [])

    problem = Problem(**data, author_id=author_id)
    db.add(problem)
    await db.flush()

    for tag_name in tags:
        db.add(ProblemTag(problem_id=problem.id, tag_name=tag_name.strip()))

    for tc in test_cases_data:
        db.add(ProblemTestCase(problem_id=problem.id, **tc))

    await db.commit()
    await db.refresh(problem)
    return problem


async def update_problem(db: AsyncSession, problem_id: int, data: dict) -> Problem:
    result = await db.execute(
        select(Problem).options(selectinload(Problem.tags)).where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")

    tags = data.pop("tags", None)

    for key, value in data.items():
        if value is not None:
            setattr(problem, key, value)

    if tags is not None:
        for existing_tag in list(problem.tags):
            await db.delete(existing_tag)
        for tag_name in tags:
            db.add(ProblemTag(problem_id=problem.id, tag_name=tag_name.strip()))

    problem.version += 1
    await db.commit()
    await db.refresh(problem)
    return problem


async def delete_problem(db: AsyncSession, problem_id: int) -> None:
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="题目不存在")
    await db.delete(problem)
    await db.commit()
