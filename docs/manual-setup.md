# Nova VM 2026 – manual setup walkthrough

## 1) Database setup
1. Create a PostgreSQL database (e.g. Azure Database for PostgreSQL).
2. Run SQL files in order:
   - `db/schema.sql`
   - `db/seed/001_companies.sql`
   - `db/seed/002_teams.sql`
3. Create an admin user and set `is_admin=true` in `users`.

## 2) Magic link email configuration
1. Configure an email provider (e.g. SendGrid, Azure Communication Services).
2. Set the following environment variables:
   - `BASE_URL` – the public URL of your app (used for magic link URLs)
   - `EMAIL_FROM` – sender email address
   - Email provider credentials (depends on provider)
3. The magic link login flow:
   - User calls `POST /api/auth/login` with their email
   - A magic link is sent to their email
   - User clicks the link which calls `GET /api/auth/verify?token=...`
   - A session token is returned for subsequent authenticated requests

## 3) football-data.org integration
1. Obtain an API key from football-data.org.
2. Log in as admin in the app.
3. Call `POST /api/admin/settings/football-data-key` with `{ "apiKey": "..." }`.
4. Schedule a periodic job (Azure Function / Logic App) to pull results and populate `matches` + `match_goals`.

## 4) Azure setup
1. Create an Azure Resource Group.
2. Create an Azure DevOps service connection named in `$(azureServiceConnection)`.
3. Set pipeline variables:
   - `azureServiceConnection`
   - `resourceGroupName`
   - `appName`
4. Commit `azure-pipelines/azure-pipelines.yml` and run pipeline.

## 5) Future Entra ID migration path
1. Keep `auth_provider` on user records.
2. Add `entra_object_id` column when migrating.
3. Switch to Azure AD B2C/Entra external ID.
4. Maintain same `users.id` mapping for prediction and scoring continuity.

## 6) Localization
Supported language targets for UI copy:
- English
- Norwegian
- Swedish
- Polish
