"""problems, problem_tags, problem_solutions, submissions

Revision ID: 0002_problems
Revises: 0001_initial
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002_problems"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "problems",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("input_format", sa.Text(), nullable=True),
        sa.Column("output_format", sa.Text(), nullable=True),
        sa.Column("sample_cases", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("hidden_cases", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("difficulty", sa.String(length=20), server_default="简单", nullable=False),
        sa.Column("time_limit", sa.Integer(), server_default="1000", nullable=False),
        sa.Column("memory_limit", sa.Integer(), server_default="256", nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "problem_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("tag_name", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("problem_id", "tag_name"),
    )

    op.create_table(
        "problem_solutions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("contest_id", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=20), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="Pending", nullable=False),
        sa.Column("execution_time", sa.Integer(), nullable=True),
        sa.Column("execution_memory", sa.Integer(), nullable=True),
        sa.Column("score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("judge_log", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"]),
        sa.ForeignKeyConstraint(["contest_id"], ["contests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_submissions_user_problem", "submissions", ["user_id", "problem_id", "created_at"])
    op.create_index("idx_submissions_contest", "submissions", ["contest_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_submissions_contest", table_name="submissions")
    op.drop_index("idx_submissions_user_problem", table_name="submissions")
    op.drop_table("submissions")
    op.drop_table("problem_solutions")
    op.drop_table("problem_tags")
    op.drop_table("problems")
