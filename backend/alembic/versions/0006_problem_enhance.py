"""problem table enhancements + hints + company_tags + similar + votes + status + lists

Revision ID: 0006
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005_enhance_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("problems", sa.Column("slug", sa.String(200), unique=True))
    op.add_column("problems", sa.Column("view_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("accept_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("submit_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("upvote_count", sa.Integer(), server_default="0"))
    op.add_column("problems", sa.Column("downvote_count", sa.Integer(), server_default="0"))
    op.create_index("idx_problems_slug", "problems", ["slug"])
    op.create_index("idx_problems_list", "problems", ["is_public", "difficulty", "id"])

    op.create_table("problem_hints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.UniqueConstraint("problem_id", "sort_order"),
    )

    op.create_table("company_tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_name", sa.String(100), nullable=False),
        sa.Column("frequency", sa.Integer(), server_default="0"),
        sa.UniqueConstraint("problem_id", "company_name"),
    )
    op.create_index("idx_company_name", "company_tags", ["company_name"])

    op.create_table("similar_problems",
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("similar_problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("similarity_reason", sa.String(50)),
    )

    op.create_table("problem_votes",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("vote_type", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table("user_problem_status",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="todo"),
        sa.Column("first_solved_at", sa.DateTime(timezone=True)),
        sa.Column("attempt_count", sa.Integer(), server_default="0"),
    )

    op.create_table("problem_lists",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_public", sa.Boolean(), server_default="false"),
        sa.Column("problem_ids", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.add_column("problem_solutions", sa.Column("vote_count", sa.Integer(), server_default="0"))
    op.add_column("problem_solutions", sa.Column("solution_type", sa.String(20), server_default="user"))
    op.add_column("problem_solutions", sa.Column("is_official", sa.Boolean(), server_default="false"))


def downgrade() -> None:
    op.drop_table("problem_lists")
    op.drop_table("user_problem_status")
    op.drop_table("problem_votes")
    op.drop_table("similar_problems")
    op.drop_table("company_tags")
    op.drop_table("problem_hints")
    op.drop_column("problems", "downvote_count")
    op.drop_column("problems", "upvote_count")
    op.drop_column("problems", "submit_count")
    op.drop_column("problems", "accept_count")
    op.drop_column("problems", "view_count")
    op.drop_column("problems", "slug")
    op.drop_column("problem_solutions", "is_official")
    op.drop_column("problem_solutions", "solution_type")
    op.drop_column("problem_solutions", "vote_count")
