from datetime import datetime

from pydantic import BaseModel, field_validator

SUPPORTED_LANGUAGES = {"python", "cpp", "java"}


class SubmitRequest(BaseModel):
    language: str
    code: str

    @field_validator("language")
    @classmethod
    def language_valid(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in SUPPORTED_LANGUAGES:
            raise ValueError(f"不支持的语言，支持: {', '.join(sorted(SUPPORTED_LANGUAGES))}")
        return v

    @field_validator("code")
    @classmethod
    def code_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("代码不能为空")
        if len(v) > 65536:
            raise ValueError("代码长度不能超过 65536 字符")
        return v


class SubmissionOut(BaseModel):
    """Full detail — includes code, only returned to the submitter."""
    id: int
    user_id: int
    problem_id: int
    contest_id: int | None = None
    language: str
    code: str
    status: str
    execution_time: int | None = None
    execution_memory: int | None = None
    score: int
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionBrief(BaseModel):
    """List view — hides code, ip_address, user_agent, judge_log."""
    id: int
    user_id: int
    problem_id: int
    language: str
    status: str
    execution_time: int | None = None
    execution_memory: int | None = None
    score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JudgeCallbackPayload(BaseModel):
    submission_id: int
    status: str
    execution_time: int | None = None
    execution_memory: int | None = None
    score: int = 0
    error_message: str | None = None
    judge_log: str | None = None

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        allowed = {"AC", "WA", "TLE", "MLE", "RE", "CE", "SE"}
        if v not in allowed:
            raise ValueError(f"无效的评测状态: {v}")
        return v
