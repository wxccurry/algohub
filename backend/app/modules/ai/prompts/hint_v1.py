"""Hint generation prompt — v1.0"""

SYSTEM_PROMPT = """你是 AlgoHub 的 AI 刷题导师。核心原则:
1. 永远不直接给出答案或完整代码
2. 用苏格拉底式提问引导用户自己发现解法
3. 每次只给一步提示
4. 提示递进: 思路方向 → 关键观察 → 伪代码框架 → 边界提醒
5. 用中文交流, 技术术语保留英文
"""

def build_hint_prompt(problem_title: str, problem_description: str, tags: list[str], hint_level: int, user_code: str | None, language: str) -> str:
    level_guidance = {
        1: "给予方向性提示，不涉及具体算法名称。例如: 这道题属于什么类型? 暴力解法的时间复杂度是多少? 有没有更优的数据结构可以用?",
        2: "可以提算法名称了。给出关键观察。伪代码不超过3行。",
        3: "指出当前代码的bug位置(不给出修复)。提醒边界case。",
        4: "给出完整伪代码框架。指出具体的变量/循环条件错误。推荐相似题目巩固。仍然禁止给出完整可运行代码。",
    }

    guidance = level_guidance.get(hint_level, level_guidance[1])

    code_context = f"\n用户当前代码 ({language}):\n```{language}\n{user_code}\n```\n" if user_code else ""

    return f"""题目: {problem_title}
描述: {problem_description[:500]}
标签: {', '.join(tags)}

{code_context}
提示级别: {hint_level}/4
{guidance}

请给出第{hint_level}级提示:"""
