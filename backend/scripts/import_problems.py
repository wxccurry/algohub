#!/usr/bin/env python3
"""Import problems from JSON file into AlgoHub database."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.shared.database import async_session
from app.modules.problem.models import (
    Problem,
    ProblemTag,
    ProblemHint,
    ProblemSolution,
    CompanyTag,
)


async def import_problems(json_path: str):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    problems = data if isinstance(data, list) else data.get("problems", [])

    async with async_session() as db:
        imported = 0
        skipped = 0

        for item in problems:
            slug = item.get("slug")
            if not slug:
                print(f"  [WARN] Problem '{item.get('title', '?')}' has no slug, skipping")
                continue

            # Check duplicate by slug
            existing = await db.execute(
                select(Problem).where(Problem.slug == slug)
            )
            if existing.scalar_one_or_none():
                print(f"  [SKIP] [{item.get('difficulty', '?')}] {item['title']} -- slug '{slug}' already exists")
                skipped += 1
                continue

            problem = Problem(
                slug=slug,
                title=item["title"],
                description=item.get("description_md", item.get("description", "")),
                input_format=item.get("input_format"),
                output_format=item.get("output_format"),
                difficulty=item.get("difficulty", "easy"),
                difficulty_score=item.get("difficulty_score", 1500),
                time_limit=item.get("time_limit_ms", 1000),
                memory_limit=item.get("memory_limit_mb", 256),
                source=item.get("source"),
                sample_cases=item.get("sample_cases", []),
                hidden_cases=item.get("hidden_cases", []),
                author_id=1,  # System admin
                is_public=True,
            )
            db.add(problem)
            await db.flush()

            # Tags
            for tag_name in item.get("tags", []):
                db.add(ProblemTag(problem_id=problem.id, tag_name=tag_name))

            # Hints
            for idx, hint_text in enumerate(item.get("hints", []), start=1):
                db.add(ProblemHint(
                    problem_id=problem.id,
                    sort_order=idx,
                    content=hint_text,
                ))

            # Solutions
            for sol in item.get("solutions", []):
                db.add(ProblemSolution(
                    problem_id=problem.id,
                    author_id=sol.get("author_id", 1),
                    content=sol["content"],
                    language=sol.get("language"),
                    solution_type="official" if sol.get("is_official") else "user",
                    is_official=sol.get("is_official", False),
                ))

            # Company tags
            for company_name in item.get("company_tags", []):
                db.add(CompanyTag(
                    problem_id=problem.id,
                    company_name=company_name,
                    frequency=0,
                ))

            imported += 1
            print(f"  [OK] [{item.get('difficulty', '?')}] {item['title']}")

        await db.commit()
        line = "-" * 40
        print(f"\n{line}")
        print(f"Done: {imported} imported, {skipped} skipped, {len(problems)} total")
        print(line)
        return imported, skipped


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_problems.py <problems.json>")
        sys.exit(1)
    asyncio.run(import_problems(sys.argv[1]))
