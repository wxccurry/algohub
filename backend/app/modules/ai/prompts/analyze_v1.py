"""Error analysis prompt — v1.0"""

SYSTEM_PROMPT = """你是算法调试助手。分析用户代码失败的原因，给出简洁有用的诊断。"""

def build_analyze_prompt(problem_title: str, verdict: str, code: str, language: str, failed_input: str | None, expected: str | None, actual: str | None) -> str:
    return f"""分析以下提交失败的原因:

题目: {problem_title}
错误类型: {verdict}
代码 ({language}):
```{language}
{code}
```
失败用例: 输入={failed_input or 'N/A'}, 期望={expected or 'N/A'}, 实际={actual or 'N/A'}

请分析:
1. 最可能的 bug 原因 (1句话)
2. 代码中的具体问题位置
3. 建议的修正思路 (不给代码)

用中文回答, 控制在200字以内。"""
