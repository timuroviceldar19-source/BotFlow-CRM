# Bot API

FastAPI + aiogram service for onboarding users, tracking traffic sources, and exposing lightweight admin stats.

## Development

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e .
alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

`alembic upgrade head` uses `DATABASE_URL` from the environment. If you point it at PostgreSQL, that server must already be reachable.

Run the bot process separately:

```bash
python -m app.run_bot
```

## Migrations

- Config: [alembic.ini](/C:/Users/Madara/Desktop/Openai/apps/bot-api/alembic.ini)
- Environment: [alembic/env.py](/C:/Users/Madara/Desktop/Openai/apps/bot-api/alembic/env.py)
- Versions: [alembic/versions](/C:/Users/Madara/Desktop/Openai/apps/bot-api/alembic/versions)
- Migrations are the source of truth for schema changes; app startup no longer calls `create_all`

Current baseline:
- [20260331_0001_baseline_schema.py](/C:/Users/Madara/Desktop/Openai/apps/bot-api/alembic/versions/20260331_0001_baseline_schema.py)
