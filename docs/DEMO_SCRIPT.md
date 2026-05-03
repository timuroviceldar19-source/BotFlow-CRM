# BotFlow CRM Demo Script

Use this script to present BotFlow CRM in a recruiter screen share or during a technical interview.

## Demo Goal

Show that BotFlow CRM is more than a static dashboard: it connects Telegram onboarding, attribution, partner events, verification review, and admin analytics into one working funnel.

## Before The Demo

Run the local stack and seed demo data:

```bash
npm install
npm run dev:start
npm run demo:seed
```

Open:

```text
http://127.0.0.1:3000/dashboard
```

Use the `ADMIN_API_KEY` from `.env` when prompted.

## 5-Minute Walkthrough

### 1. Dashboard Overview

Open `/dashboard`.

What to show:

- total users, pending verifications, verified users, and conversions;
- the recent activity feed;
- how the dashboard gives an operator a quick health check of the funnel.

Expected demo metrics:

- Users: 6
- Pending: 1
- Verified: 2
- Conversions: 2

What to say:

```text
This screen is the operator view. It summarizes the funnel: how many users entered, how many are waiting for review, how many were verified, and how many converted through partner postbacks.
```

### 2. User Detail

Open a demo user from the dashboard.

What to show:

- Telegram profile fields;
- source, UTM, partner slug, and tracking code;
- event timeline;
- verification status.

What to say:

```text
Each user keeps attribution and lifecycle history. That makes it possible to answer where the user came from, what they clicked, whether they submitted proof, and what the final status is.
```

### 3. Partner Events

Open `/dashboard/partner-events`.

What to show:

- partner registration and conversion events;
- event payload visibility;
- compatibility with both the neutral conversion event and the deprecated legacy alias.

What to say:

```text
Partner postbacks are stored as funnel events. The project also keeps a deprecated endpoint alias so older integrations can continue to send conversion data without breaking the dashboard.
```

### 4. Link Builder

Return to `/dashboard` and show the campaign/link builder area.

What to show:

- source and UTM fields;
- generated Telegram start payload;
- tracking-friendly partner link structure.

What to say:

```text
The link builder helps an operator create tracked campaign links. When a user opens the bot through a link, the backend can connect their actions and partner postbacks to the original campaign.
```

### 5. Verification Flow

Show a pending or rejected verification user.

What to show:

- verification submission metadata;
- approval/rejection state;
- how status is reflected in the funnel.

What to say:

```text
The product includes an operations workflow, not only analytics. Admins can review submissions and move users between pending, approved, and rejected states.
```

## Optional Technical Checks

Run:

```bash
npm run test:backend
npm run demo:seed
npm run build:web
```

Expected result:

- backend tests pass;
- demo seed can be run repeatedly without duplicated data;
- Next.js production build completes successfully.

## Interview Close

Use this closing summary:

```text
BotFlow CRM demonstrates a production-style automation system: Telegram bot flow, FastAPI backend, database models and migrations, webhook tracking, Next.js dashboard, demo data, and tests. The goal was to make the project understandable in a few minutes while still showing real backend and product engineering.
```
