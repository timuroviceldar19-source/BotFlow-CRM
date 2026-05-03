# BotFlow CRM v1.0.0 Release Notes

## Summary

BotFlow CRM v1.0.0 is a portfolio-ready release of a production-style Telegram CRM funnel.

The project demonstrates an end-to-end automation workflow:

- Telegram bot onboarding and verification collection;
- FastAPI backend APIs and partner webhook ingestion;
- SQLAlchemy data models with Alembic migrations;
- Next.js admin dashboard for funnel analytics and operations;
- idempotent local demo data;
- backend tests for critical tracking and statistics logic.

## Product Highlights

- Tracks users from Telegram entry to verified conversion.
- Stores attribution from start payloads, UTM tags, partner slugs, and tracking codes.
- Shows admins funnel metrics, user profiles, event timelines, verification state, campaign presets, broadcasts, and partner events.
- Supports neutral partner conversion webhooks.
- Keeps a deprecated legacy webhook alias for backward compatibility.
- Runs locally with realistic seeded data and no real Telegram or partner credentials.

## Portfolio Materials

This release includes:

- [Case study](CASE_STUDY.md)
- [Demo script](DEMO_SCRIPT.md)
- [Architecture notes](ARCHITECTURE_NOTES.md)
- [Portfolio copy](PORTFOLIO_COPY.md)
- Dashboard screenshots in [docs/screenshots](screenshots)

## Verified Checks

Verified on 2026-05-03:

```bash
npm run test:backend
npm run demo:seed
npm run build:web
```

Results:

- backend tests: 8 passed;
- demo seed: completed successfully and remains idempotent;
- web build: completed successfully with Next.js 16.2.1.

## Recommended GitHub Release Description

```text
BotFlow CRM v1.0.0 is a production-style Telegram CRM funnel portfolio project.

It combines a Telegram bot, FastAPI backend, SQL database, partner webhooks, and a Next.js admin dashboard into one lead-generation workflow. The release includes realistic demo data, backend tests, screenshots, a case study, a demo walkthrough, and architecture notes.

Verification:
- npm run test:backend
- npm run demo:seed
- npm run build:web
```
