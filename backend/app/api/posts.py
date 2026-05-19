import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_from_token, require_login, require_admin
from app.schemas.post import PostCreate, PostUpdate, CommentCreate
from app.services import post_service
from app.utils.response import success

router = APIRouter()


@router.get("")
async def list_posts(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("latest"),
    tag: str | None = None, search: str | None = None,
    author_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    items, total = await post_service.list_posts(
        db, page=page, page_size=page_size, sort=sort, tag=tag, search=search, author_id=author_id,
    )
    return success(data={"items": items, "total": total, "page": page, "page_size": page_size})


@router.get("/{post_id}")
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text as sa_text
    r = await db.execute(sa_text(
        "SELECT id, author_id, title, content, summary, tags, stars_count, forks_count, "
        "views, forked_from, is_public, is_pinned, created_at, updated_at "
        "FROM posts WHERE id = :pid"
    ), {"pid": post_id})
    row = r.fetchone()
    if not row:
        return error(message="笔记不存在", code=404)
    await db.execute(sa_text("UPDATE posts SET views = views + 1 WHERE id = :pid"), {"pid": post_id})
    await db.commit()
    tags_val = row[5]
    if isinstance(tags_val, str):
        try: tags_val = json.loads(tags_val)
        except: tags_val = []
    if tags_val is None: tags_val = []
    return success(data={
        "id": row[0], "author_id": row[1], "title": row[2],
        "content": row[3], "summary": row[4], "tags": tags_val,
        "stars_count": row[6], "forks_count": row[7],
        "views": (row[8] or 0) + 1, "forked_from": row[9],
        "is_public": row[10], "is_pinned": row[11],
        "created_at": str(row[12]) if row[12] else None,
        "updated_at": str(row[13]) if row[13] else None,
    })


@router.post("")
async def create_post(
    req: PostCreate,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    post = await post_service.create_post(db, req.model_dump(), current_user["user_id"])
    return success(data={"id": post.id}, message="笔记创建成功", code=201)


@router.put("/{post_id}")
async def update_post(
    post_id: int, req: PostUpdate,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    await post_service.update_post(db, post_id, req.model_dump(exclude_unset=True), current_user["user_id"])
    return success(message="笔记已更新")


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user["role"] == "admin"
    await post_service.delete_post(db, post_id, current_user["user_id"], is_admin)
    return success(message="笔记已删除")


# -- Star --

@router.post("/{post_id}/star")
async def toggle_star(
    post_id: int,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    result = await post_service.toggle_star(db, post_id, current_user["user_id"])
    return success(data=result, message="已收藏" if result["starred"] else "已取消收藏")


# -- Fork --

@router.post("/{post_id}/fork")
async def fork_post(
    post_id: int,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    forked = await post_service.fork_post(db, post_id, current_user["user_id"])
    return success(data={"id": forked.id}, message="Fork 成功", code=201)


# -- Comments --

@router.get("/{post_id}/comments")
async def get_comments(post_id: int, db: AsyncSession = Depends(get_db)):
    comments = await post_service.get_comments(db, post_id)
    return success(data=comments)


@router.post("/{post_id}/comments")
async def create_comment(
    post_id: int, req: CommentCreate,
    current_user: dict = Depends(require_login),
    db: AsyncSession = Depends(get_db),
):
    comment = await post_service.create_comment(
        db, post_id, current_user["user_id"], req.content, req.parent_id,
    )
    return success(data={"id": comment.id}, message="评论成功", code=201)
