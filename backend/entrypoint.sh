#!/bin/bash
set -e

echo "==> Running database migrations..."
python -c "from alembic.config import Config; from alembic import command; command.upgrade(Config('alembic.ini'), 'head')" 2>&1 || echo "Migration skipped (may already be up to date)"

echo "==> Checking if problems exist..."
python -c "
import asyncio
from app.shared.database import async_session
from sqlalchemy import text
async def check():
    async with async_session() as db:
        r = await db.execute(text('SELECT COUNT(*) FROM problems'))
        count = r.scalar()
        if count == 0:
            print('No problems found, importing...')
            import subprocess
            subprocess.run(['python', 'scripts/import_problems.py', 'data/problems_v1.json'])
        else:
            print(f'{count} problems already exist, skipping import')
asyncio.run(check())
"

echo "==> Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
