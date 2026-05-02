# BotFlow CRM Portfolio Checklist

Use this checklist before publishing or sharing the project.

## Local Demo

1. Copy the example environment:

```bash
copy .env.example .env
```

2. Install dependencies:

```bash
npm install
cd apps/bot-api
python -m venv .venv
.venv\Scripts\activate
pip install -e .
cd ..\..
```

3. Start the local stack:

```bash
npm run dev:start
```

4. Seed demo data:

```bash
npm run demo:seed
```

5. Open the dashboard:

```text
http://127.0.0.1:3000/dashboard
```

Expected demo metrics:

- Users: 6
- Pending: 1
- Verified: 2
- Conversions: 2

## Verification Commands

Run these before pushing:

```bash
npm run test:backend
npm run demo:seed
npm run build:web
```

Expected result:

- backend tests pass;
- demo seed can run repeatedly;
- web build completes without Google Fonts or external font fetches.

## Repository Hygiene

Do not commit:

- `.env` or other local env files;
- `node_modules`;
- `.venv`;
- `.next`;
- SQLite runtime databases;
- local uploaded files from `apps/bot-api/storage`;
- `runtime-logs`;
- IDE or assistant-local folders such as `.idea` and `.claude`.

Safe to commit:

- source code under `apps`;
- Docker and infra files;
- `README.md`;
- `docs/CASE_STUDY.md`;
- portfolio screenshots under `docs/screenshots`;
- `.env.example`.

## GitHub Presentation

Before making the repository public:

- confirm `.env` is ignored;
- confirm screenshots render in README;
- confirm `README.md` explains the product in the first screen;
- confirm `docs/CASE_STUDY.md` has the interview narrative;
- add a concise repository description:

```text
Production-ready Telegram CRM funnel with FastAPI, aiogram, Next.js, partner webhooks, demo seeding, and tests.
```

## Resume Bullet

```text
Built a production-ready Telegram CRM automation platform with FastAPI, Next.js, async SQLAlchemy, aiogram, Alembic migrations, partner webhooks, idempotent demo seeding, and automated backend tests.
```
