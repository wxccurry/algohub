import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.dependencies.auth import require_login
from app.modules.ai.service import AIService
from app.modules.ai.schemas import AIChatRequest, AIHintRequest, AIAnalyzeRequest, AIRecommendRequest
from app.models.ai_usage_log import AIUsageLog

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])


async def _log_ai_usage(user_id: int | None, endpoint: str, tokens_in: int = 0, tokens_out: int = 0,
                        prompt_version: str | None = None, cache_hit: bool = False,
                        error_signature: str | None = None):
    """Lightweight fire-and-forget insert into ai_usage_logs."""
    try:
        from app.database import async_session
        async with async_session() as db:
            db.add(AIUsageLog(
                user_id=user_id,
                endpoint=endpoint,
                prompt_version=prompt_version,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                error_signature=error_signature,
                cache_hit=cache_hit,
            ))
            await db.commit()
    except Exception:
        pass  # Logging should never break the response


@router.post("/hint")
async def ai_hint(req: AIHintRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    result = await svc.generate_hint(req.problem_id, req.hint_level, req.current_code, req.language)
    asyncio.create_task(_log_ai_usage(
        user_id=current_user.id,
        endpoint="hint",
        tokens_in=estimate_tokens(req.current_code or ""),
        tokens_out=estimate_tokens(result["hint"]),
        prompt_version="hint_v1",
    ))
    return {"code": 200, "message": "ok", "data": result}


@router.post("/analyze")
async def ai_analyze(req: AIAnalyzeRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    result = await svc.analyze_error(req.problem_id, req.verdict, req.user_code, req.language, req.failed_input, req.expected_output, req.actual_output)
    asyncio.create_task(_log_ai_usage(
        user_id=current_user.id,
        endpoint="analyze",
        tokens_in=estimate_tokens(req.user_code),
        tokens_out=estimate_tokens(result["analysis"]),
        prompt_version="analyze_v1",
        cache_hit=result.get("source") == "cache",
        error_signature=result.get("signature"),
    ))
    return {"code": 200, "message": "ok", "data": result}


@router.post("/chat")
async def ai_chat(req: AIChatRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    # Rough estimate: combined token count of all messages
    input_text = " ".join(m["content"] for m in req.messages) + (req.current_code or "")
    asyncio.create_task(_log_ai_usage(
        user_id=current_user.id,
        endpoint="chat",
        tokens_in=estimate_tokens(input_text),
        prompt_version="chat_v1",
    ))
    return StreamingResponse(
        svc.chat_stream(req.problem_id, req.messages, req.current_code, req.language),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
    )


@router.post("/recommend")
async def ai_recommend(req: AIRecommendRequest, db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    result = await svc.recommend_similar(req.problem_id)
    return {"code": 200, "message": "ok", "data": result}


def estimate_tokens(text: str) -> int:
    """Rough token estimation: ~4 chars per token for Chinese/English mixed text."""
    if not text:
        return 0
    return max(1, len(text) // 4)
