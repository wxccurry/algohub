"""enhance schema: problem_test_cases, new fields, indexes

Revision ID: 0003_enhance
Revises: 0002_problems
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
# SQLite-compatible (no JSONB import needed)

revision: str = "0003_enhance"
down_revision: Union[str, None] = "0002_problems"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── problem_test_cases ──
    op.create_table(
        "problem_test_cases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("input_content", sa.Text(), nullable=False),
        sa.Column("output_content", sa.Text(), nullable=False),
        sa.Column("is_sample", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("subtask_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("points", sa.Integer(), server_default="10", nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_test_cases_problem", "problem_test_cases", ["problem_id"])
    op.create_index("idx_test_cases_subtask", "problem_test_cases", ["problem_id", "subtask_id"])
    op.create_index("idx_test_cases_sample", "problem_test_cases", ["problem_id", "is_sample"])

    # ── problems: new columns ──
    op.add_column("problems", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    op.add_column("problems", sa.Column("is_public", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("problems", sa.Column("difficulty_score", sa.Integer(), server_default="1500", nullable=False))

    # ── submissions: new columns ──
    op.add_column("submissions", sa.Column("code_hash", sa.String(length=64), nullable=True))
    op.add_column("submissions", sa.Column("ip_address", sa.String(length=45), nullable=True))
    op.add_column("submissions", sa.Column("user_agent", sa.Text(), nullable=True))

    # ── indexes ──
    op.create_index("idx_submissions_user_problem", "submissions", ["user_id", "problem_id", "created_at"],
                    if_not_exists=True)
    op.create_index("idx_submissions_contest", "submissions", ["contest_id", "created_at"], if_not_exists=True)
    op.create_index("idx_submissions_problem_status", "submissions", ["problem_id", "status"])
    op.create_index("idx_submissions_code_hash", "submissions", ["code_hash"])


def downgrade() -> None:
    op.drop_index("idx_submissions_code_hash", table_name="submissions")
    op.drop_index("idx_submissions_problem_status", table_name="submissions")
    op.drop_index("idx_submissions_contest", table_name="submissions")
    op.drop_index("idx_submissions_user_problem", table_name="submissions")

    op.drop_column("submissions", "user_agent")
    op.drop_column("submissions", "ip_address")
    op.drop_column("submissions", "code_hash")

    op.drop_column("problems", "difficulty_score")
    op.drop_column("problems", "is_public")
    op.drop_column("problems", "version")

    op.drop_index("idx_test_cases_sample", table_name="problem_test_cases")
    op.drop_index("idx_test_cases_subtask", table_name="problem_test_cases")
    op.drop_index("idx_test_cases_problem", table_name="problem_test_cases")
    op.drop_table("problem_test_cases")
