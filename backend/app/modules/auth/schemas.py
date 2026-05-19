import datetime
from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# Auth schemas (migrated from app/schemas/auth.py)
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 50:
            raise ValueError("用户名长度 3-50 字符")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6 or len(v) > 128:
            raise ValueError("密码长度 6-128 字符")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# User schemas (migrated from app/schemas/user.py)
# ---------------------------------------------------------------------------

GENDER_LABELS = {0: "未知", 1: "男", 2: "女"}
STATUS_LABELS = {1: "在校生", 2: "在职-看机会", 3: "在职-不看机会"}


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime.datetime
    model_config = {"from_attributes": True}


class PrivacySettings(BaseModel):
    show_submissions: bool = True
    show_solutions: bool = True
    show_checkin_calendar: bool = True
    show_ranking: bool = True


class UserProfileOut(BaseModel):
    nickname: str | None = None
    avatar: str | None = None
    gender: int = 0
    gender_label: str = "未知"
    bio: str | None = None
    preferred_languages: str | None = None
    github_url: str | None = None
    blog_url: str | None = None
    current_status: int = 1
    current_status_label: str = "在校生"
    school: str | None = None
    major: str | None = None
    organization: str | None = None
    region_code: str | None = None
    solved_count: int = 0
    rating: int = 1500
    streak_days: int = 0
    max_streak: int = 0
    contribution: int = 0
    privacy_settings: PrivacySettings = PrivacySettings()
    model_config = {"from_attributes": True}


class UserWithProfile(UserOut):
    profile: UserProfileOut | None = None


class ProfileUpdateRequest(BaseModel):
    nickname: str | None = None
    gender: int | None = None
    bio: str | None = None
    preferred_languages: str | None = None
    github_url: str | None = None
    blog_url: str | None = None
    current_status: int | None = None
    school: str | None = None
    major: str | None = None
    organization: str | None = None
    region_code: str | None = None
    privacy_settings: PrivacySettings | None = None

    @field_validator("nickname")
    @classmethod
    def nickname_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2 or len(v) > 32:
            raise ValueError("昵称长度 2-32 字符")
        if not v.isalnum() and not all(c.isalnum() or c in "_-" for c in v):
            raise ValueError("昵称只能包含字母、数字、下划线和连字符")
        return v

    @field_validator("gender")
    @classmethod
    def gender_valid(cls, v: int | None) -> int | None:
        if v is not None and v not in (0, 1, 2):
            raise ValueError("性别码无效 (0/1/2)")
        return v

    @field_validator("bio")
    @classmethod
    def bio_valid(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 160:
            raise ValueError("个人简介最多 160 字符")
        return v

    @field_validator("current_status")
    @classmethod
    def status_valid(cls, v: int | None) -> int | None:
        if v is not None and v not in (1, 2, 3):
            raise ValueError("状态码无效 (1/2/3)")
        return v

    @field_validator("github_url", "blog_url")
    @classmethod
    def url_valid(cls, v: str | None) -> str | None:
        if v is not None and v.strip():
            v = v.strip()
            if not v.startswith(("http://", "https://")):
                raise ValueError("URL 必须以 http:// 或 https:// 开头")
            if len(v) > 256:
                raise ValueError("URL 长度不能超过 256")
        return v


# Keep UserProfileUpdate as an alias for backward compatibility
UserProfileUpdate = ProfileUpdateRequest
