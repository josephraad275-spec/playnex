# Supabase account and persistence foundation

The migrations contain the optional account-profile schema/trigger and proposed persistence tables. Room gameplay remains in the in-memory Node server. Applying SQL does not make rooms or moderation durable. No Supabase account, project, API key or hosted database has been provisioned here. See `docs/ACCOUNT_SETUP.md` for the server adapter's optional configuration.

Use a new local Supabase stack (`supabase start`, then `supabase db reset`) or an authorized isolated staging project. Apply both migrations in filename order. Migration 002 requires signup metadata `{display_name: string, age_confirmed: true}`; names are trimmed, 2–24 characters and reject control characters/angle brackets. Roles and timestamps in user metadata confer no authority. Existing Auth users are not silently backfilled or age-attested. Review/back up existing projects before applying constraints/triggers.

Clients cannot mutate game state, room membership, invitation hashes, entitlements or administrative roles. Raw game state is never client-selectable because trivia answers must remain private. Future room APIs must authorize members, project safe state and use row locking/version checks. Never place a service-role key in Vite configuration. Prepared `private.user_roles` database roles are separate from the backend's optional `PLAYNEX_ADMIN_IDS` allowlist.

`tests/database.test.ts` executes migrations/policies in embedded PostgreSQL with an emulated Auth schema; consult its actual test result. The SQL files under `supabase/tests` are additional standalone templates, not claimed executed against hosted Supabase. Live GoTrue/Auth, email, recovery, provider logging, secret settings and production deployment still require staging validation.
