from datetime import datetime, date
from typing import Any

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def _serialize(obj: Any) -> Any:
    """Recursively convert objects to JSON-safe types."""
    if obj is None:
        return None
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialize(v) for v in obj]
    if isinstance(obj, (str, int, float, bool)):
        return obj
    # SQLAlchemy model — convert known columns, skip relationships to avoid lazy loading
    if hasattr(obj, "__table__"):
        result = {}
        for col in obj.__table__.columns:
            val = getattr(obj, col.key)
            result[col.key] = _serialize(val)
        return result
    # Fallback: try jsonable_encoder for unknown objects
    try:
        return jsonable_encoder(obj)
    except Exception:
        return str(obj)


def success(data: Any = None, message: str = "success", code: int = 200) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": _serialize(data)})


def error(message: str = "error", code: int = 400, data: Any = None) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": _serialize(data)})
