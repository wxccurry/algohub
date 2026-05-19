from datetime import datetime, date
from typing import Any

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def _serialize(obj: Any) -> Any:
    """Recursively convert objects to JSON-safe types."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialize(v) for v in obj]
    if hasattr(obj, "__dict__") and not isinstance(obj, type):
        # SQLAlchemy model — use jsonable_encoder
        return jsonable_encoder(obj)
    return obj


def success(data: Any = None, message: str = "success", code: int = 200) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": _serialize(data)})


def error(message: str = "error", code: int = 400, data: Any = None) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": _serialize(data)})
