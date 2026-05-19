"""enhance user_profiles with enterprise fields

Revision ID: 0005_enhance_profiles
Revises: 0004_posts
Create Date: 2026-05-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_enhance_profiles"
down_revision: Union[str, None] = "0004_posts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("nickname", sa.String(length=32), nullable=True))
    op.add_column("user_profiles", sa.Column("gender", sa.Integer(), server_default="0", nullable=False))
    op.add_column("user_profiles", sa.Column("preferred_languages", sa.String(length=128), nullable=True))
    op.add_column("user_profiles", sa.Column("github_url", sa.String(length=256), nullable=True))
    op.add_column("user_profiles", sa.Column("blog_url", sa.String(length=256), nullable=True))
    op.add_column("user_profiles", sa.Column("current_status", sa.Integer(), server_default="1", nullable=False))
    op.add_column("user_profiles", sa.Column("organization", sa.String(length=128), nullable=True))
    op.add_column("user_profiles", sa.Column("region_code", sa.String(length=12), nullable=True))
    op.add_column("user_profiles", sa.Column("privacy_settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))

    op.create_index("idx_profiles_nickname", "user_profiles", ["nickname"], unique=True, if_not_exists=False)
    op.create_index("idx_profiles_organization", "user_profiles", ["organization"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_profiles_organization", table_name="user_profiles")
    op.drop_index("idx_profiles_nickname", table_name="user_profiles")
    op.drop_column("user_profiles", "privacy_settings")
    op.drop_column("user_profiles", "region_code")
    op.drop_column("user_profiles", "organization")
    op.drop_column("user_profiles", "current_status")
    op.drop_column("user_profiles", "blog_url")
    op.drop_column("user_profiles", "github_url")
    op.drop_column("user_profiles", "preferred_languages")
    op.drop_column("user_profiles", "gender")
    op.drop_column("user_profiles", "nickname")
