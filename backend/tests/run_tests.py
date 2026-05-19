#!/usr/bin/env python3
"""Run all backend tests."""
import sys
import pytest

if __name__ == "__main__":
    sys.exit(pytest.main(["-v", "tests/"]))
