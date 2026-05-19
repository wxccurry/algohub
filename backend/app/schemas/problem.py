from datetime import datetime

from pydantic import BaseModel, field_validator

VALID_DIFFICULTIES = {"easy", "medium", "hard", "expert"}


class TagOut(BaseModel):
    tag_name: str
    model_config = {"from_attributes": True}


class TestCaseCreate(BaseModel):
    input_content: str
    output_content: str
    is_sample: bool = False
    subtask_id: int = 1
    points: int = 10
    description: str | None = None


class TestCaseOut(BaseModel):
    """Returns only sample test cases — NEVER includes hidden test data."""
    id: int
    is_sample: bool
    subtask_id: int
    points: int
    description: str | None = None
    # input_content / output_content only returned for is_sample=True in detail view

    model_config = {"from_attributes": True}


class ProblemCreate(BaseModel):
    title: str
    description: str
    input_format: str | None = None
    output_format: str | None = None
    sample_cases: list[dict] = []
    hidden_cases: list[dict] = []
    difficulty: str = "easy"
    difficulty_score: int = 1500
    time_limit: int = 1000
    memory_limit: int = 256
    source: str | None = None
    is_public: bool = True
    tags: list[str] = []
    test_cases: list[TestCaseCreate] = []

    @field_validator("difficulty")
    @classmethod
    def difficulty_valid(cls, v: str) -> str:
        if v not in VALID_DIFFICULTIES:
            raise ValueError(f"难度必须是 {VALID_DIFFICULTIES}")
        return v

    @field_validator("time_limit")
    @classmethod
    def time_limit_valid(cls, v: int) -> int:
        if v < 100 or v > 15000:
            raise ValueError("时间限制范围 100–15000 ms")
        return v

    @field_validator("memory_limit")
    @classmethod
    def memory_limit_valid(cls, v: int) -> int:
        if v < 16 or v > 1024:
            raise ValueError("内存限制范围 16–1024 MB")
        return v

    @field_validator("difficulty_score")
    @classmethod
    def score_valid(cls, v: int) -> int:
        if v < 0 or v > 5000:
            raise ValueError("难度分范围 0–5000")
        return v


class ProblemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    input_format: str | None = None
    output_format: str | None = None
    sample_cases: list[dict] | None = None
    hidden_cases: list[dict] | None = None
    difficulty: str | None = None
    difficulty_score: int | None = None
    time_limit: int | None = None
    memory_limit: int | None = None
    source: str | None = None
    is_public: bool | None = None
    tags: list[str] | None = None


class ProblemBrief(BaseModel):
    id: int
    title: str
    difficulty: str
    difficulty_score: int
    tags: list[str]
    source: str | None = None
    is_public: bool
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProblemDetail(BaseModel):
    """Public API response — hidden_cases and hidden test_case content are stripped."""
    id: int
    title: str
    description: str
    input_format: str | None = None
    output_format: str | None = None
    sample_cases: list[dict]
    difficulty: str
    difficulty_score: int
    time_limit: int
    memory_limit: int
    source: str | None = None
    is_public: bool
    version: int
    tags: list[str]
    sample_count: int
    hidden_count: int
    author_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SolutionCreate(BaseModel):
    content: str
    language: str | None = None


class SolutionOut(BaseModel):
    id: int
    author_id: int
    content: str
    language: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
