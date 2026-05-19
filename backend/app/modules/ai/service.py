"""AI service — hint generation, error analysis, chat, recommendations."""
import hashlib
import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.exceptions import NotFoundError
from app.modules.problem.repository import ProblemRepository
from app.modules.ai.prompts.hint_v1 import SYSTEM_PROMPT as HINT_SYSTEM, build_hint_prompt
from app.modules.ai.prompts.analyze_v1 import SYSTEM_PROMPT as ANALYZE_SYSTEM, build_analyze_prompt

class AIService:
    def __init__(self, db: AsyncSession, api_key: str | None = None):
        self.db = db
        self.problem_repo = ProblemRepository(db)
        self.api_key = api_key
        # In production, use a real AI client. For now, provide structured mock responses.
        self._hint_cache: dict[str, str] = {}  # error_signature -> cached analysis

    async def generate_hint(self, problem_id: int, hint_level: int, current_code: str | None = None, language: str = "python"):
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        tags = [t.tag_name for t in (problem.tags or [])]

        prompt = build_hint_prompt(problem.title, problem.description or "", tags, hint_level, current_code, language)

        # TODO: Replace with actual DeepSeek API call in production
        hint_text = self._mock_hint(problem.title, hint_level)
        return {"hint": hint_text, "level": hint_level}

    async def analyze_error(self, problem_id: int, verdict: str, user_code: str, language: str, failed_input: str | None, expected: str | None, actual: str | None):
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)

        # Error signature caching
        sig = hashlib.sha256(f"{problem_id}:{verdict}:{user_code[:100]}".encode()).hexdigest()[:16]
        if sig in self._hint_cache:
            return {"analysis": self._hint_cache[sig], "source": "cache", "signature": sig}

        prompt = build_analyze_prompt(problem.title, verdict, user_code, language, failed_input, expected, actual)
        analysis = self._mock_analysis(verdict)
        self._hint_cache[sig] = analysis
        return {"analysis": analysis, "source": "ai", "signature": sig}

    async def chat_stream(self, problem_id: int, messages: list[dict], current_code: str | None = None, language: str = "python") -> AsyncGenerator[str, None]:
        """SSE streaming chat. Yields JSON chunks."""
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)

        # TODO: Replace with actual DeepSeek streaming API call
        response = f"我看到你在做「{problem.title}」。有什么我可以帮你的？记住我不会直接给答案，但可以引导你找到解法。"
        for i in range(0, len(response), 10):
            chunk = response[i:i+10]
            yield json.dumps({"delta": chunk}, ensure_ascii=False)
        yield "[DONE]"

    async def recommend_similar(self, problem_id: int, limit: int = 5):
        """Recommend similar problems based on shared tags."""
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        # Simple tag-based recommendation
        # TODO: Use actual similar_problems table or AI-based recommendation
        return {"recommendations": [], "method": "tag_based"}

    def _mock_hint(self, title: str, level: int) -> str:
        hints = {
            1: f"思考一下「{title}」属于哪类问题？有没有比暴力更高效的方法？",
            2: f"对于「{title}」，考虑使用合适的数据结构来优化时间复杂度。",
            3: f"检查你的循环边界条件和变量更新时机是否正确。注意特殊输入的处理。",
            4: f"伪代码框架已就绪。请特别注意: 1) 初始化条件 2) 循环不变量 3) 返回值处理。",
        }
        return hints.get(level, hints[1])

    def _mock_analysis(self, verdict: str) -> str:
        analyses = {
            "WA": "很可能在边界条件处理上有误。检查当输入为空、只有一个元素或所有元素相同时的表现。",
            "TLE": "时间复杂度可能过高。考虑是否存在重复计算，或者可以用更高效的数据结构。",
            "RE": "可能存在数组越界、空指针或除零错误。检查索引范围和空值处理。",
            "CE": "编译错误。检查语法、缺少的导入和类型声明。",
        }
        return analyses.get(verdict, f"提交结果为 {verdict}，请检查代码逻辑。")
