import pytest
from app.shared.security import hash_password, verify_password


class TestSecurity:
    def test_hash_and_verify(self):
        pw = "test_password_123"
        hashed = hash_password(pw)
        assert hashed != pw
        assert verify_password(pw, hashed)
        assert not verify_password("wrong_password", hashed)

    def test_unique_hashes(self):
        pw = "same_password"
        h1 = hash_password(pw)
        h2 = hash_password(pw)
        assert h1 != h2  # different salts
        assert verify_password(pw, h1)
        assert verify_password(pw, h2)
