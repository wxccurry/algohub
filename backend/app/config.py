# NOTE: All secrets are read from environment variables (prefixed with ALGOHUB_).
# For production deployments, consider using a dedicated secrets manager:
# - HashiCorp Vault (https://www.vaultproject.io/)
# - AWS Secrets Manager / GCP Secret Manager
# - Azure Key Vault
# These tools provide encrypted storage, access auditing, and rotation support
# that .env files and plain env vars cannot offer.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./algohub_dev.db"
    DATABASE_URL_SYNC: str = "sqlite:///./algohub_dev.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    JUDGE_CALLBACK_SECRET: str = "change-me-judge-callback-secret"
    JUDGE_CALLBACK_URL: str = "http://localhost:8000/api/judge/callback"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    BCRYPT_ROUNDS: int = 12

    model_config = {"env_prefix": "ALGOHUB_", "case_sensitive": True}


settings = Settings()
