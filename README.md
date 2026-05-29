# Nova VM 2026

Nova VM 2026 is an MVP FIFA World Cup 2026 prediction game for Nova companies, built with Express 5, an in-memory store, SQL seed files, and a mobile-first frontend.

## Features
- Magic-link signup and login flow
- Protected prediction and dashboard routes
- Group and match predictions with kickoff locks
- 48 placeholder World Cup nations across 12 groups (`A-L`)
- Group-stage schedule seed with 72 matches
- Matches API with scores, status, teams, and flag emojis
- Overall and per-stage leaderboard
- Admin endpoints for user listing, manual overrides, scoring reruns, football-data API key storage, and result sync
- `football-data.org` integration for finished results import and auto-scoring
- Localized UI and API translations for English, Norwegian, Swedish, and Polish
- Mobile-first static frontend served by Express
- Azure Bicep infrastructure and Azure DevOps pipeline files

## Project structure
- `src/server.js` - Express API and static file hosting
- `lib/store.js` - in-memory data store, seeded teams/matches, scoring sync helpers
- `lib/scoring.js` - scoring rules and stage multipliers
- `lib/auth.js` - magic-link and session handling
- `lib/football-data.js` - football-data.org result fetching
- `lib/i18n.js` - translation catalog
- `public/` - landing page, app shell, styles, and client-side logic
- `db/schema.sql` - database schema
- `db/seed/` - companies, teams, and matches seed files

## Key API endpoints
- `POST /api/signup`
- `POST /api/auth/login`
- `GET /api/auth/verify?token=...`
- `GET /api/matches`
- `POST /api/predictions/group`
- `POST /api/predictions/match`
- `GET /api/leaderboard?stage=group`
- `GET /api/dashboard/:userId`
- `GET /api/i18n/:lang`
- `GET /api/admin/users`
- `POST /api/admin/settings/football-data-key`
- `POST /api/admin/sync-results`
- `POST /api/admin/scoring/rerun`
- `POST /api/admin/manual-override`

## Run locally
```bash
npm install
npm test
npm start
```

Open `http://localhost:3000` for the frontend. The API is available under `/api/*`.

## Notes
- The backend intentionally uses an in-memory store for MVP simplicity.
- Team groups are realistic placeholder distributions rather than an official FIFA 2026 draw.
- Magic-link emails are stubbed and returned as preview URLs for local development.
