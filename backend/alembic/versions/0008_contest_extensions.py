"""contest extensions

Revision ID: 0008
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("contest_participants",
        sa.Column("contest_id", sa.Integer(), sa.ForeignKey("contests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("score", sa.Integer(), server_default="0"),
        sa.Column("rank", sa.Integer()),
        sa.Column("penalty", sa.Integer(), server_default="0"),
    )
    op.create_table("contest_problems",
        sa.Column("contest_id", sa.Integer(), sa.ForeignKey("contests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("display_id", sa.String(1), nullable=False),
        sa.Column("points", sa.Integer(), server_default="100"),
    )


def downgrade() -> None:
    op.drop_table("contest_problems")
    op.drop_table("contest_participants")
