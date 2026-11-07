# Optional Supabase account setup

This integration is optional: guest gaming works without a Supabase project. Configuration, migration source and adapter tests do not establish that a hosted account service has been configured or verified. Do not silently simulate successful signup when configuration is missing.

## Founder authorization and secrets

The founder must authorize the Supabase project/account and approve any billable operations first. Review the current free-tier limits, data region, email limits, usage alerts and spending controls. No project or paid service has been provisioned by this code. Enter values in the authorized host's secret/environment settings; never send credentials through chat or commit them.

| Server-only configuration   | Purpose                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Authorized HTTPS project endpoint                                                                                                       |
| `SUPABASE_ANON_KEY`         | Public/project API key used by the server adapter; account data requests also carry the user's verified provider token                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional privileged key used only for account deletion via the provider Admin API; keep strictly server-side                            |
| `PLAYNEX_ADMIN_IDS`         | Optional comma-separated verified Supabase account UUID allowlist for server moderation endpoints; no user metadata may grant this role |

No key belongs in `VITE_*` configuration. A provider's project API key is different from a user's access token. Configure accepted origins, email confirmation, recovery redirect URLs, password requirements and email delivery in the provider dashboard for the approved staging origin. Never disable email verification to make a test appear successful. Review provider logs for sensitive data and appropriate retention.

## Database and identity lifecycle

1. In an isolated project/database, apply both migrations in filename order. Review existing project contents and backup before applying any migration to a nonempty database.
2. Migration 002 creates an `auth.users` trigger that requires metadata `{display_name: string, age_confirmed: true}`. It trims and validates the 2–24 character display name, records self-attestation using server time, and selects a permitted default avatar. String `"true"`, missing/false attestation, control characters, angle brackets and invalid names are rejected.
3. Metadata such as `role`, `admin` or an `adult_attested_at` value never grants permission. Existing users are not automatically backfilled or age-attested. Social/OAuth signup is not an advertised fallback: the trigger's adult/name gate must be intentionally integrated before enabling a new provider.
4. Profiles are created by the trigger; clients may read/update only their own permitted profile fields. Raw email and Auth identities are not public profiles. Changes to metadata do not rewrite the attestation timestamp.
5. Auth user deletion cascades the associated database profile, entitlements, memberships and block relationships. This is not proof of deletion from provider backups or third-party systems; a retention/deletion policy still requires review.

The backend's explicit `PLAYNEX_ADMIN_IDS` allowlist is independent of the prepared `private.user_roles` database table. Neither is writable through the normal client profile API. Do not claim changing one automatically synchronizes the other. Review administrator UUIDs and access whenever accounts change.

## Verification gates

Run the local database test suite, then verify against the actual staging Supabase project: registration/email confirmation, login, identity validation, own-profile updates, recovery completion, export, logout/revocation, deletion without stale server sessions, cross-user denials and admin authorization. A mocked provider response is an adapter check, not hosted Auth assurance. Never test with production personal data.

Room gameplay remains in memory. Accounts do not make rooms, blocks/reports, analytics or rankings durable unless their specific persistence path has been implemented and verified. Keep those limitations in the release report.
