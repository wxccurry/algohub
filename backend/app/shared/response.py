from typing import Any

from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "success", code: int = 200) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": data})


def error(message: str = "error", code: int = 400, data: Any = None) -> JSONResponse:
    return JSONResponse(content={"code": code, "message": message, "data": data})
