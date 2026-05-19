import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import AppError

logger = logging.getLogger("algohub.error")


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.error(
        "app_error",
        extra={
            "code": exc.code,
            "message": exc.message,
            "path": str(request.url.path),
            "trace_id": getattr(request.state, "trace_id", None),
        },
    )
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
