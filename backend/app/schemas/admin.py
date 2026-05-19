from pydantic import BaseModel


class DashboardOverview(BaseModel):
    total_users: int
    total_problems: int
    total_submissions: int
    today_active_users: int
    overall_ac_rate: float


class UserAnalytics(BaseModel):
    user_id: int
    username: str
    total_submissions: int
    ac_count: int
    ac_rate: float
    solved_problems: int
    streak_days: int
    rating: int


class ProblemAnalytics(BaseModel):
    problem_id: int
    title: str
    difficulty: str
    total_submissions: int
    ac_count: int
    ac_rate: float
