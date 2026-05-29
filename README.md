# Nova VM 2026

FIFA World Cup 2026 prediction game foundation for Nova organisation companies.

## Implemented baseline
- Signup endpoint with company selection and magic link email authentication
- Magic link login flow (email-based, no external auth provider required)
- Group and match prediction endpoints with lock checks
- Scoring engine matching requested scoring model and knockout multipliers
- Leaderboard and dashboard endpoints
- Admin endpoints for football-data API key, manual override, and scoring rerun
- Postgres schema + seeds (companies and 48 teams across 12 groups)
- Azure Bicep IaC and Azure DevOps pipeline
- Manual setup walkthrough for external system steps

## Run locally
```bash
npm install
npm test
npm start
```

API starts on `http://localhost:3000`.
