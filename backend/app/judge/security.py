"""Judge security utilities — HMAC, code hash, resource limits."""

import hashlib
import hmac
import time

from app.config import settings

HMAC_TIMESTAMP_WINDOW = 60  # seconds


def compute_code_hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def generate_hmac(payload: dict) -> str:
    """Generate HMAC-SHA256 signature with embedded timestamp for anti-replay."""
    body = _serialize(payload)
    return hmac.new(settings.JUDGE_CALLBACK_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()


def verify_hmac(payload: dict, signature: str) -> bool:
    """Verify HMAC with timestamp window check (anti-replay)."""
    ts = payload.get("timestamp", 0)
    if abs(int(time.time()) - int(ts)) > HMAC_TIMESTAMP_WINDOW:
        return False
    expected = generate_hmac(payload)
    return hmac.compare_digest(expected, signature)


def _serialize(payload: dict) -> str:
    import json
    return json.dumps(payload, sort_keys=True, ensure_ascii=False)
