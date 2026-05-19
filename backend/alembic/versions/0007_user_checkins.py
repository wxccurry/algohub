"""user checkins + profile enhancement

Revision ID: 0007
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("user_checkins",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("checkin_date", sa.Date(), primary_key=True),
        sa.Column("problem_count", sa.Integer(), server_default="0"),
    )
    op.create_index("idx_checkins_user_range", "user_checkins", ["user_id", sa.text("checkin_date DESC")])
    op.add_column("user_profiles", sa.Column("max_streak", sa.Integer(), server_default="0"))
    op.add_column("user_profiles", sa.Column("contribution", sa.Integer(), server_default="0"))
    op.add_column("user_profiles", sa.Column("last_checkin_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_table("user_checkins")
    op.drop_column("user_profiles", "last_checkin_at")
    op.drop_column("user_profiles", "contribution")
    op.drop_column("user_profiles", "max_streak")
