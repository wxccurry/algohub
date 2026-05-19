from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.post import Post, Comment, UserStar


async def list_posts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    sort: str = "latest",
    tag: str | None = None,
    search: str | None = None,
    author_id: int | None = None,
) -> tuple[list[dict], int]:
    query = select(Post).where(Post.is_public == True)

    if tag:
        query = query.where(Post.tags.any(tag))
    if search:
        ilike = f"%{search}%"
        query = query.where(Post.title.ilike(ilike) | Post.content.ilike(ilike))
    if author_id:
        query = query.where(Post.author_id == author_id)

    if sort == "hot":
        query = query.order_by(Post.stars_count.desc(), Post.created_at.desc())
    elif sort == "pinned":
        query = query.order_by(Post.is_pinned.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    posts = (await db.execute(query)).scalars().all()

    results = [
        {
            "id": p.id, "author_id": p.author_id, "title": p.title,
            "summary": p.summary, "tags": p.tags, "stars_count": p.stars_count,
            "forks_count": p.forks_count, "views": p.views, "is_pinned": p.is_pinned,
            "created_at": p.created_at, "updated_at": p.updated_at,
        }
        for p in posts
    ]
    return results, total


async def get_post(db: AsyncSession, post_id: int) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    post.views += 1
    await db.commit()
    return post


async def create_post(db: AsyncSession, data: dict, author_id: int) -> Post:
    post = Post(**data, author_id=author_id)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def update_post(db: AsyncSession, post_id: int, data: dict, user_id: int) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    if post.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权编辑")
    for key, value in data.items():
        if value is not None:
            setattr(post, key, value)
    await db.commit()
    await db.refresh(post)
    return post


async def delete_post(db: AsyncSession, post_id: int, user_id: int, is_admin: bool = False) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    if post.author_id != user_id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除")
    await db.delete(post)
    await db.commit()


async def toggle_star(db: AsyncSession, post_id: int, user_id: int) -> dict:
    result = await db.execute(
        select(UserStar).where(UserStar.user_id == user_id, UserStar.post_id == post_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        post = await db.get(Post, post_id)
        if post and post.stars_count > 0:
            post.stars_count -= 1
        await db.commit()
        return {"starred": False, "stars_count": post.stars_count if post else 0}
    else:
        db.add(UserStar(user_id=user_id, post_id=post_id))
        post = await db.get(Post, post_id)
        if post:
            post.stars_count += 1
        await db.commit()
        return {"starred": True, "stars_count": post.stars_count if post else 0}


async def fork_post(db: AsyncSession, post_id: int, user_id: int) -> Post:
    original = await db.get(Post, post_id)
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="原笔记不存在")
    forked = Post(
        author_id=user_id,
        title=f"Fork: {original.title}",
        content=original.content,
        summary=original.summary,
        tags=original.tags,
        forked_from=post_id,
    )
    db.add(forked)
    original.forks_count += 1
    await db.commit()
    await db.refresh(forked)
    return forked


async def create_comment(db: AsyncSession, post_id: int, user_id: int, content: str, parent_id: int | None = None) -> Comment:
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    comment = Comment(post_id=post_id, user_id=user_id, content=content, parent_id=parent_id)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def get_comments(db: AsyncSession, post_id: int) -> list[dict]:
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.parent_id == None)
        .options(selectinload(Comment.replies))
        .order_by(Comment.created_at.asc())
    )
    comments = result.scalars().all()

    def format_comment(c: Comment) -> dict:
        return {
            "id": c.id, "post_id": c.post_id, "user_id": c.user_id,
            "parent_id": c.parent_id, "content": c.content,
            "created_at": c.created_at,
            "replies": [format_comment(r) for r in (c.replies or [])],
        }

    return [format_comment(c) for c in comments]
