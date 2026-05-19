import json
import logging
import os
import shutil
import subprocess
import tempfile
import time

try:
    import resource
    _has_resource = True
except ImportError:
    _has_resource = False

import httpx

from celery_app.celery_config import celery_app
from app.config import settings
from app.judge.security import generate_hmac

logger = logging.getLogger("algohub.judge")

MAX_OUTPUT_BYTES = 10 * 1024 * 1024  # 10 MB max output
MAX_MEMORY_BYTES = 256 * 1024 * 1024  # 256 MB


def _docker_available() -> bool:
    try:
        subprocess.run(["docker", "version"], capture_output=True, timeout=5, check=False)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _set_resource_limits():
    """Basic resource limits for subprocess judge (Unix only)."""
    if not _has_resource:
        return
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
    except (ValueError, resource.error):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (30, 30))  # 30 sec CPU time
    except (ValueError, resource.error):
        pass


def _judge_python_subprocess(code: str, test_cases: list, time_limit_ms: int) -> list[dict]:
    results = []
    time_limit_sec = max(time_limit_ms / 1000, 1.0)

    tmp_dir = tempfile.mkdtemp(prefix="algohub_judge_")
    code_file = os.path.join(tmp_dir, "solution.py")

    try:
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        for i, tc in enumerate(test_cases):
            inp = tc.get("input", "")
            expected = tc.get("output", "").strip()

            try:
                proc = subprocess.run(
                    ["python", code_file],
                    input=inp,
                    capture_output=True,
                    text=True,
                    timeout=time_limit_sec,
                    **( {"preexec_fn": _set_resource_limits} if os.name != "nt" else {} ),
                )

                if proc.returncode != 0:
                    results.append({
                        "case": i + 1,
                        "status": "RE",
                        "message": proc.stderr[:300] or f"exit code {proc.returncode}",
                    })
                else:
                    actual = proc.stdout.strip()[:MAX_OUTPUT_BYTES]
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
                results.append({"case": i + 1, "status": "TLE", "message": f"超时 >{time_limit_ms}ms"})

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return results


def _summarise_results(results: list[dict]) -> dict:
    for r in results:
        if r["status"] != "AC":
            return {
                "status": r["status"],
                "execution_time": None,
                "execution_memory": None,
                "judge_log": json.dumps(results, ensure_ascii=False),
                "error_message": r.get("message"),
            }
    return {
        "status": "AC",
        "execution_time": None,
        "execution_memory": None,
        "judge_log": json.dumps(results, ensure_ascii=False),
    }


def _callback(submission_id: int, result: dict) -> None:
    payload = {
        "submission_id": submission_id,
        **result,
        "score": 100 if result["status"] == "AC" else 0,
        "timestamp": int(time.time()),
    }
    signature = generate_hmac(payload)

    try:
        resp = httpx.post(
            settings.JUDGE_CALLBACK_URL,
            json=payload,
            headers={"X-Judge-Signature": signature},
            timeout=30,
        )
        resp.raise_for_status()
    except Exception:
        logger.exception("Judge callback failed for submission %s", submission_id)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=2)
def run_judge(self, submission_id: int, code: str, language: str, test_cases: list, time_limit: int, memory_limit: int):
    logger.info("Judging submission %d language=%s cases=%d", submission_id, language, len(test_cases or []))

    if not test_cases:
        results = [{"case": 1, "status": "AC"}]
    elif language == "python":
        results = _judge_python_subprocess(code, test_cases, time_limit)
    elif language == "cpp":
        if _docker_available():
            results = [{"case": 1, "status": "SE", "message": "C++ Docker judge — build image first"}]
        else:
            results = [{"case": 1, "status": "SE", "message": "C++ 评测需要 Docker，当前环境未检测到 Docker"}]
    elif language == "java":
        if _docker_available():
            results = [{"case": 1, "status": "SE", "message": "Java Docker judge — build image first"}]
        else:
            results = [{"case": 1, "status": "SE", "message": "Java 评测需要 Docker，当前环境未检测到 Docker"}]
    else:
        results = [{"case": 1, "status": "SE", "message": f"不支持的语言: {language}"}]

    summary = _summarise_results(results)
    _callback(submission_id, summary)
    return summary
