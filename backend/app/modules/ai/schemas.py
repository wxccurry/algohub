from pydantic import BaseModel, Field
from typing import Optional

class AIChatRequest(BaseModel):
    problem_id: int
    messages: list[dict] = []  # conversation history
    current_code: Optional[str] = None
    language: str = "python"

class AIHintRequest(BaseModel):
    problem_id: int
    hint_level: int = Field(ge=1, le=4)
    current_code: Optional[str] = None
    language: str = "python"

class AIAnalyzeRequest(BaseModel):
    problem_id: int
    verdict: str  # WA, TLE, RE, etc.
    user_code: str
    language: str
    failed_input: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None

class AIRecommendRequest(BaseModel):
    problem_id: int
