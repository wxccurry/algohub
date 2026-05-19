"""AI service — DeepSeek-powered hint generation, error analysis, chat, recommendations."""
import hashlib
import json
import logging
from typing import AsyncGenerator

from httpx import AsyncClient, HTTPError, Timeout
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import NotFoundError
from app.modules.problem.repository import ProblemRepository
from app.modules.ai.prompts.hint_v1 import SYSTEM_PROMPT as HINT_SYSTEM, build_hint_prompt
from app.modules.ai.prompts.analyze_v1 import SYSTEM_PROMPT as ANALYZE_SYSTEM, build_analyze_prompt

logger = logging.getLogger("algohub.ai")


class AIService:
    def __init__(self, db: AsyncSession, api_key: str | None = None):
        self.db = db
        self.problem_repo = ProblemRepository(db)
        self.api_key = api_key or settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL
        self.enabled = settings.AI_ENABLED and bool(self.api_key)
        self._hint_cache: dict[str, str] = {}

    @property
    def _client(self) -> AsyncClient:
        return AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=Timeout(30.0),
        )

    async def generate_hint(
        self, problem_id: int, hint_level: int,
        current_code: str | None = None, language: str = "python"
    ) -> dict:
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)
        tags = [t.tag_name for t in (problem.tags or [])]

        prompt = build_hint_prompt(
            problem.title, problem.description or "", tags,
            hint_level, current_code, language
        )

        if not self.enabled:
            return {"hint": self._mock_hint(problem.title, hint_level), "level": hint_level, "source": "mock"}

        try:
            async with self._client as client:
                resp = await client.post("/chat/completions", json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": HINT_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512,
                })
                resp.raise_for_status()
                body = resp.json()
                hint_text = body["choices"][0]["message"]["content"].strip()
                return {"hint": hint_text, "level": hint_level, "source": "ai"}
        except Exception as e:
            logger.error("AI hint failed, falling back to mock", extra={"error": str(e)})
            return {"hint": self._mock_hint(problem.title, hint_level), "level": hint_level, "source": "mock_fallback"}

    async def analyze_error(
        self, problem_id: int, verdict: str, user_code: str, language: str,
        failed_input: str | None, expected: str | None, actual: str | None
    ) -> dict:
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)

        sig = hashlib.sha256(f"{problem_id}:{verdict}:{user_code[:100]}".encode()).hexdigest()[:16]
        if sig in self._hint_cache:
            return {"analysis": self._hint_cache[sig], "source": "cache", "signature": sig}

        prompt = build_analyze_prompt(
            problem.title, verdict, user_code, language,
            failed_input, expected, actual
        )

        if not self.enabled:
            analysis = self._mock_analysis(verdict)
            self._hint_cache[sig] = analysis
            return {"analysis": analysis, "source": "mock", "signature": sig}

        try:
            async with self._client as client:
                resp = await client.post("/chat/completions", json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": ANALYZE_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 400,
                })
                resp.raise_for_status()
                body = resp.json()
                analysis = body["choices"][0]["message"]["content"].strip()
                self._hint_cache[sig] = analysis
                return {"analysis": analysis, "source": "ai", "signature": sig}
        except Exception as e:
            logger.error("AI analyze failed, falling back to mock", extra={"error": str(e)})
            analysis = self._mock_analysis(verdict)
            return {"analysis": analysis, "source": "mock_fallback", "signature": sig}

    async def chat_stream(
        self, problem_id: int, messages: list[dict],
        current_code: str | None = None, language: str = "python"
    ) -> AsyncGenerator[str, None]:
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)

        tags = [t.tag_name for t in (problem.tags or [])]

        system_msg = (
            f"{HINT_SYSTEM}\n\n"
            f"当前题目：「{problem.title}」\n"
            f"难度：{problem.difficulty}  标签：{', '.join(tags)}\n"
            f"题目描述：{problem.description[:500] if problem.description else ''}"
        )
        if current_code:
            system_msg += f"\n\n用户当前代码 ({language}):\n```{language}\n{current_code}\n```"

        api_messages = [{"role": "system", "content": system_msg}]
        api_messages += messages[-6:]  # last 6 messages only (context trimming)

        if not self.enabled:
            response = (
                f"你好！我是 AI 刷题导师。当前 AI 服务未启用，但我可以建议你：\n"
                f"1. 先独立思考「{problem.title}」的解法\n"
                f"2. 尝试写出暴力解\n"
                f"3. 思考如何优化时间复杂度\n"
                f"遇到困难的话，可以使用「提示」功能获取分步引导。"
            )
            for i in range(0, len(response), 15):
                chunk = response[i:i+15]
                yield json.dumps({"delta": chunk}, ensure_ascii=False)
            yield "[DONE]"
            return

        try:
            async with self._client as client:
                async with client.stream("POST", "/chat/completions", json={
                    "model": self.model,
                    "messages": api_messages,
                    "temperature": 0.3,
                    "max_tokens": 1024,
                    "stream": True,
                }) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                yield "[DONE]"
                                return
                            try:
                                parsed = json.loads(data)
                                delta = parsed["choices"][0]["delta"].get("content", "")
                                if delta:
                                    yield json.dumps({"delta": delta}, ensure_ascii=False)
                            except (json.JSONDecodeError, KeyError, IndexError):
                                pass
                    yield "[DONE]"
        except Exception as e:
            logger.error("AI chat stream failed", extra={"error": str(e)})
            fallback = f"抱歉，AI 服务暂时不可用（{str(e)[:50]}）。请稍后重试或使用「提示」功能。"
            yield json.dumps({"delta": fallback}, ensure_ascii=False)
            yield "[DONE]"

    async def recommend_similar(self, problem_id: int, limit: int = 5) -> dict:
        problem = await self.problem_repo.get_by_id(problem_id)
        if not problem:
            raise NotFoundError("Problem", problem_id)

        # Tag-based recommendation from DB
        tags = [t.tag_name for t in (problem.tags or [])]
        recommendations = []
        if tags:
            from sqlalchemy import select
            from app.modules.problem.models import Problem as ProblemModel, ProblemTag
            seen_ids = {problem_id}
            for tag in tags[:3]:
                result = await self.db.execute(
                    select(ProblemModel)
                    .join(ProblemTag, ProblemTag.problem_id == ProblemModel.id)
                    .where(ProblemTag.tag_name == tag, ProblemModel.is_public == True)
                    .limit(limit)
                )
                for p in result.scalars().all():
                    if p.id not in seen_ids:
                        seen_ids.add(p.id)
                        recommendations.append({
                            "id": p.id, "title": p.title,
                            "slug": p.slug, "difficulty": p.difficulty,
                        })
                    if len(recommendations) >= limit:
                        break
                if len(recommendations) >= limit:
                    break

        return {"recommendations": recommendations[:limit], "method": "tag_based"}

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
