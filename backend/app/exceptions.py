from typing import Any


class AppError(Exception):
    def __init__(self, code: int, message: str, detail: dict[str, Any] | None = None):
        self.code = code
        self.message = message
        self.detail = detail


class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(404, f"{resource} not found", {"id": identifier})


class ForbiddenError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(403, message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(401, message)


class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__(409, message)


class ValidationError(AppError):
    def __init__(self, errors: list[dict[str, Any]]):
        super().__init__(422, "Validation failed", {"errors": errors})


class RateLimitError(AppError):
    def __init__(self, retry_after: int = 60):
        super().__init__(429, "Too many requests", {"retry_after": retry_after})
