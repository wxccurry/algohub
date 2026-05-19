import pytest
from app.exceptions import NotFoundError, ForbiddenError, UnauthorizedError, ConflictError, ValidationError, AppError


class TestExceptions:
    def test_not_found(self):
        e = NotFoundError("Problem", 42)
        assert e.code == 404
        assert "Problem" in e.message
        assert e.detail == {"id": 42}

    def test_forbidden_default(self):
        e = ForbiddenError()
        assert e.code == 403
        assert e.message == "Permission denied"

    def test_forbidden_custom(self):
        e = ForbiddenError("Cannot delete")
        assert e.message == "Cannot delete"

    def test_unauthorized(self):
        e = UnauthorizedError()
        assert e.code == 401

    def test_conflict(self):
        e = ConflictError("Username exists")
        assert e.code == 409

    def test_validation(self):
        e = ValidationError([{"field": "title", "msg": "Required"}])
        assert e.code == 422
        assert e.detail == {"errors": [{"field": "title", "msg": "Required"}]}

    def test_app_error_is_exception(self):
        e = AppError(418, "Teapot")
        assert isinstance(e, Exception)
        assert e.code == 418
