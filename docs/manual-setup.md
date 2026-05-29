# Nova VM 2026 – manual setup walkthrough

## 1) Supabase setup (auth + DB)
1. Create a Supabase project.
2. Enable **Email magic link** provider in Auth.
3. Add allowed redirect URLs for your app.
4. Run SQL files in order:
   - `/tmp/workspace/fredrikandresen/usa-vm/db/schema.sql`
   - `/tmp/workspace/fredrikandresen/usa-vm/db/seed/001_companies.sql`
   - `/tmp/workspace/fredrikandresen/usa-vm/db/seed/002_teams.sql`
5. Create an admin user and set `is_admin=true` in `users`.

## 2) football-data.org integration
1. Obtain an API key from football-data.org.
2. Log in as admin in the app.
3. Call `POST /api/admin/settings/football-data-key` with `{ "apiKey": "..." }`.
4. Schedule a periodic job (Azure Function / Logic App) to pull results and populate `matches` + `match_goals`.

## 3) Azure setup
1. Create an Azure Resource Group.
2. Create an Azure DevOps service connection named in `$(azureServiceConnection)`.
3. Set pipeline variables:
   - `azureServiceConnection`
   - `resourceGroupName`
   - `appName`
4. Commit `azure-pipelines/azure-pipelines.yml` and run pipeline.

## 4) Future Entra ID migration path
1. Keep `auth_provider` on user records.
2. Add `entra_object_id` column when migrating.
3. Enable Entra provider in Supabase or switch to Azure AD B2C/Entra external ID.
4. Maintain same `users.id` mapping for prediction and scoring continuity.

## 5) Localization
Supported language targets for UI copy:
- English
- Norwegian
- Swedish
- Polish
