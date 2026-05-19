from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    input_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_cases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    hidden_cases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    difficulty: Mapped[str] = mapped_column(String(20), default="easy")
    difficulty_score: Mapped[int] = mapped_column(Integer, default=1500)
    time_limit: Mapped[int] = mapped_column(Integer, default=1000)
    memory_limit: Mapped[int] = mapped_column(Integer, default=256)
    author_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    tags: Mapped[list["ProblemTag"]] = relationship(back_populates="problem", cascade="all, delete-orphan")
    solutions: Mapped[list["ProblemSolution"]] = relationship(back_populates="problem", cascade="all, delete-orphan")
    test_cases: Mapped[list["ProblemTestCase"]] = relationship(back_populates="problem", cascade="all, delete-orphan")


class ProblemTag(Base):
    __tablename__ = "problem_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    tag_name: Mapped[str] = mapped_column(String(50), nullable=False)

    problem: Mapped["Problem"] = relationship(back_populates="tags")
    __table_args__ = (UniqueConstraint("problem_id", "tag_name"),)


class ProblemSolution(Base):
    __tablename__ = "problem_solutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    problem: Mapped["Problem"] = relationship(back_populates="solutions")


class ProblemTestCase(Base):
    __tablename__ = "problem_test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id", ondelete="CASCADE"))
    input_content: Mapped[str] = mapped_column(Text, nullable=False)
    output_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    subtask_id: Mapped[int] = mapped_column(Integer, default=1)
    points: Mapped[int] = mapped_column(Integer, default=10)
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)

    problem: Mapped["Problem"] = relationship(back_populates="test_cases")
