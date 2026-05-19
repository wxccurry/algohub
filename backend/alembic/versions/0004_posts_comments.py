"""posts, comments, user_stars

Revision ID: 0004_posts
Revises: 0003_enhance
Create Date: 2026-05-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
# SQLite-compatible (no ARRAY type)

revision: str = "0004_posts"
down_revision: Union[str, None] = "0003_enhance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("cover_image", sa.Text(), nullable=True),
        sa.Column("stars_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("forks_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("views", sa.Integer(), server_default="0", nullable=False),
        sa.Column("forked_from", sa.Integer(), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_pinned", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["forked_from"], ["posts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_posts_author", "posts", ["author_id", "created_at"])
    op.create_index("idx_posts_feed", "posts", ["is_public", "is_pinned", "created_at"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["comments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_comments_post", "comments", ["post_id", "created_at"])

    op.create_table(
        "user_stars",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "post_id"),
    )


def downgrade() -> None:
    op.drop_table("user_stars")
    op.drop_table("comments")
    op.drop_index("idx_posts_feed", table_name="posts")
    op.drop_index("idx_posts_author", table_name="posts")
    op.drop_table("posts")
