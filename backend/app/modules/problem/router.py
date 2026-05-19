from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_from_token, require_author_or_admin
from app.modules.problem.schemas import (
    ProblemCreate,
    ProblemUpdate,
    ProblemSolutionCreate,
)
from app.modules.problem.service import ProblemService
from app.shared.database import get_db
from app.utils.response import success

router = APIRouter(prefix="/api/problems", tags=["题库"])


@router.get("")
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    difficulty: str | None = Query(None),
    tag: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    results, total = await service.list_problems(
        page=page,
        page_size=page_size,
        difficulty=difficulty,
        tag=tag,
        search=search,
    )
    return success(
        data={"items": results, "total": total, "page": page, "page_size": page_size}
    )


@router.get("/{problem_id}")
async def get_problem(problem_id: int, db: AsyncSession = Depends(get_db)):
    service = ProblemService(db)
    problem = await service.get_problem(problem_id)
    return success(data=problem)


@router.post("")
async def create_problem(
    req: ProblemCreate,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    problem = await service.create_problem(req, current_user["user_id"])
    return success(
        data={"id": problem.id, "title": problem.title},
        message="题目创建成功",
        code=201,
    )


@router.put("/{problem_id}")
async def update_problem(
    problem_id: int,
    req: ProblemUpdate,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    await service.update_problem(problem_id, req, current_user)
    return success(message="题目已更新")


@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: int,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    await service.delete_problem(problem_id, current_user)
    return success(message="题目已删除")


# ---- Solutions ----


@router.get("/{problem_id}/solutions")
async def list_solutions(
    problem_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    solutions = await service.get_solutions(problem_id, page=page, page_size=page_size)
    data = [
        {
            "id": s.id,
            "author_id": s.author_id,
            "content": s.content,
            "language": s.language,
            "created_at": s.created_at.isoformat(),
        }
        for s in solutions
    ]
    return success(data=data)


@router.post("/{problem_id}/solutions")
async def create_solution(
    problem_id: int,
    req: ProblemSolutionCreate,
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    service = ProblemService(db)
    solution = await service.create_solution(problem_id, req, current_user["user_id"])
    return success(data={"id": solution.id}, message="题解发布成功", code=201)
