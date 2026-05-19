from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.dependencies.auth import require_login
from app.modules.ai.service import AIService
from app.modules.ai.schemas import AIChatRequest, AIHintRequest, AIAnalyzeRequest, AIRecommendRequest

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

@router.post("/hint")
async def ai_hint(req: AIHintRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    result = await svc.generate_hint(req.problem_id, req.hint_level, req.current_code, req.language)
    return {"code": 200, "message": "ok", "data": result}

@router.post("/analyze")
async def ai_analyze(req: AIAnalyzeRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
    result = await svc.analyze_error(req.problem_id, req.verdict, req.user_code, req.language, req.failed_input, req.expected_output, req.actual_output)
    return {"code": 200, "message": "ok", "data": result}

@router.post("/chat")
async def ai_chat(req: AIChatRequest, current_user=Depends(require_login), db: AsyncSession = Depends(get_db)):
    svc = AIService(db)
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
