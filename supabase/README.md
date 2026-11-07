# Supabase foundation (not connected)

The migration is a proposed persistence/auth foundation. The beta currently uses an in-memory Node server. Applying this SQL does not connect it to the app. No Supabase account, project, API key, or database has been provisioned.

Use a new local Supabase stack (`supabase start`, then `supabase db reset`) or an authorized staging project. This migration has not been executed against PostgreSQL here. Review it before applying; back up existing projects first.

Client roles cannot mutate game state, room membership, invitation hashes, entitlements, or administrative roles. Raw game state is never client-selectable because trivia answers must remain private. Future server APIs must authorize members, project safe state, and use row locking/version checks. Never place a service-role key in Vite configuration.

Before integration, add and run SQL policy tests with two authenticated users plus anonymous access, test all disallowed writes and direct room reads, verify report ownership, and verify users cannot self-grant roles/entitlements. Implement transactional server RPCs and authenticated realtime delivery. Do not enable raw `rooms` broadcasts.
