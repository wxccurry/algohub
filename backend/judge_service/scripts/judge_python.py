#!/usr/bin/env python3
"""In-container Python judge script.

Reads /judge/solution.py and /judge/tests.json.
For each test case, runs the solution with stdin=case["input"],
captures stdout, compares with case["output"].
Prints JSON array of per-case results to stdout.
Exits 0 always (results communicated via JSON).
"""
import json
import os
import subprocess
import sys

CODE_FILE = "/judge/solution.py"
TESTS_FILE = "/judge/tests.json"
TIME_LIMIT_SEC = float(os.environ.get("TIME_LIMIT", 5))


def main():
    if not os.path.exists(CODE_FILE):
        print(json.dumps([{"case": 1, "status": "SE", "message": "代码文件未找到"}]))
        return

    with open(CODE_FILE, encoding="utf-8") as f:
        code = f.read()

    tests = []
    if os.path.exists(TESTS_FILE):
        with open(TESTS_FILE, encoding="utf-8") as f:
            tests = json.load(f)

    if not tests:
        tests = [{"input": "", "output": ""}]

    results = []
    for i, tc in enumerate(tests):
        inp = tc.get("input", "")
        expected = tc.get("output", "").strip()

        try:
            proc = subprocess.run(
                [sys.executable, CODE_FILE],
                input=inp,
                capture_output=True,
                text=True,
                timeout=TIME_LIMIT_SEC,
            )
            if proc.returncode != 0:
                results.append({"case": i + 1, "status": "RE", "message": proc.stderr[:200]})
            else:
                actual = proc.stdout.strip()
                if actual == expected:
                    results.append({"case": i + 1, "status": "AC"})
                else:
                    results.append({
                        "case": i + 1,
                        "status": "WA",
                        "expected": expected[:200],
                        "actual": actual[:200],
                    })
        except subprocess.TimeoutExpired:
            results.append({"case": i + 1, "status": "TLE", "message": "超时"})

    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
