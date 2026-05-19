"""submissions table with monthly partitions

Revision ID: 0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create submissions_runtime_stats
    op.create_table("submission_runtime_stats",
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("language", sa.String(20), primary_key=True),
        sa.Column("percentile_25_ms", sa.Integer()),
        sa.Column("percentile_50_ms", sa.Integer()),
        sa.Column("percentile_75_ms", sa.Integer()),
        sa.Column("percentile_95_ms", sa.Integer()),
        sa.Column("total_count", sa.Integer(), server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("submission_runtime_stats")
