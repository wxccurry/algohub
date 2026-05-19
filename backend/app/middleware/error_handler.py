from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import AppError


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.code if exc.code < 500 else 500,
        content={
            "code": exc.code,
            "message": exc.message,
            "data": None,
            "errors": exc.detail.get("errors") if exc.detail else None,
            "trace_id": getattr(request.state, "trace_id", None),
        },
    )
