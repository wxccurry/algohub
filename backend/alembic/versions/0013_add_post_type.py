"""add post_type to posts

Revision ID: 0013
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("post_type", sa.String(20), server_default="community", nullable=False))


def downgrade() -> None:
    op.drop_column("posts", "post_type")
