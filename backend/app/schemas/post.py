from datetime import datetime

from pydantic import BaseModel, field_validator


class PostCreate(BaseModel):
    title: str
    content: str
    summary: str | None = None
    tags: list[str] = []
    is_public: bool = True

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 200:
            raise ValueError("标题长度 1-200 字符")
        return v


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    summary: str | None = None
    tags: list[str] | None = None
    is_public: bool | None = None


class PostBrief(BaseModel):
    id: int; author_id: int; title: str; summary: str | None
    tags: list | None; stars_count: int; forks_count: int; views: int
    is_pinned: bool; created_at: datetime; updated_at: datetime

    model_config = {"from_attributes": True}


class PostDetail(BaseModel):
    id: int; author_id: int; title: str; content: str; summary: str | None
    tags: list | None; stars_count: int; forks_count: int; views: int
    forked_from: int | None; is_public: bool; is_pinned: bool
    created_at: datetime; updated_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str
    parent_id: int | None = None

    @field_validator("content")
    @classmethod
    def content_valid(cls, v: str) -> str:
        if not v.strip(): raise ValueError("评论不能为空")
        if len(v) > 5000: raise ValueError("评论不能超过 5000 字符")
        return v


class CommentOut(BaseModel):
    id: int; post_id: int; user_id: int; parent_id: int | None
    content: str; created_at: datetime
    replies: list["CommentOut"] = []

    model_config = {"from_attributes": True}
