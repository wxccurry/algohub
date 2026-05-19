from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_from_token, require_author_or_admin
from app.schemas.problem import ProblemCreate, ProblemUpdate, SolutionCreate
from app.services import problem_service
from app.utils.response import success

router = APIRouter()


@router.get("")
async def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    difficulty: str | None = Query(None),
    tag: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    results, total = await problem_service.list_problems(
        db, page=page, page_size=page_size, difficulty=difficulty, tag=tag, search=search,
    )
    return success(data={"items": results, "total": total, "page": page, "page_size": page_size})


@router.get("/{problem_id}")
async def get_problem(problem_id: int, db: AsyncSession = Depends(get_db)):
    problem = await problem_service.get_problem(db, problem_id)
    return success(data=problem)


@router.post("")
async def create_problem(
    req: ProblemCreate,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    problem = await problem_service.create_problem(db, req.model_dump(), current_user["user_id"])
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
    await problem_service.update_problem(db, problem_id, req.model_dump(exclude_unset=True))
    return success(message="题目已更新")


@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: int,
    current_user: dict = Depends(require_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await problem_service.delete_problem(db, problem_id)
    return success(message="题目已删除")


# ---- Solutions ----

@router.get("/{problem_id}/solutions")
async def list_solutions(problem_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.problem import ProblemSolution

    result = await db.execute(
        select(ProblemSolution)
        .where(ProblemSolution.problem_id == problem_id)
        .order_by(ProblemSolution.created_at.desc())
    )
    solutions = result.scalars().all()
    data = [
        {"id": s.id, "author_id": s.author_id, "content": s.content,
         "language": s.language, "created_at": s.created_at.isoformat()}
        for s in solutions
    ]
    return success(data=data)


@router.post("/{problem_id}/solutions")
async def create_solution(
    problem_id: int,
    req: SolutionCreate,
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    from app.models.problem import ProblemSolution

    solution = ProblemSolution(
        problem_id=problem_id,
        author_id=current_user["user_id"],
        content=req.content,
        language=req.language,
    )
    db.add(solution)
    await db.commit()
    await db.refresh(solution)
    return success(data={"id": solution.id}, message="题解发布成功", code=201)
