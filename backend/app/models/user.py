from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Basic
    nickname: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    avatar: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[int] = mapped_column(Integer, default=0)  # 0:未知 1:男 2:女
    bio: Mapped[str | None] = mapped_column(String(160), nullable=True)

    # Tech
    preferred_languages: Mapped[str | None] = mapped_column(String(128), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    blog_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    current_status: Mapped[int] = mapped_column(Integer, default=1)  # 1:在校 2:在职看机会 3:在职不看

    # Organization & Region
    school: Mapped[str | None] = mapped_column(String(100), nullable=True)
    major: Mapped[str | None] = mapped_column(String(50), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(128), nullable=True)
    region_code: Mapped[str | None] = mapped_column(String(12), nullable=True)

    # Stats
    solved_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=1500)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Privacy
    privacy_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    user: Mapped["User"] = relationship(back_populates="profile")
