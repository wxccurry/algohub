"""Compatibility module — re-exports from app.shared.database for backward compatibility."""
from app.shared.database import (
    engine,
    async_session,
    Base,
    get_db,
)

# Legacy alias
init_db = None  # Tables managed by Alembic; no auto-create needed
