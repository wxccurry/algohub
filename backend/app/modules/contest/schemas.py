from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    rule_type: str = "acm"
    is_public: bool = True
    password: Optional[str] = None


class ContestOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    author_id: int
    rule_type: str
    is_public: bool
    participant_count: int = 0
    problem_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ContestRankingEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    score: int
    penalty: int
    solved_count: int
