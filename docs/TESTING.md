# Testing and evidence

Run checks from SETUP.md. Actual results belong in the release PR or this document after execution. Expected coverage and actual local evidence are separated below.

## Required automated coverage

- Rule engines: valid moves, rejected moves, turns, wins/draws, full boards, trivia scoring/completion and sanitized answers.
- Room integration: independent guest identities, private invitation validation, capacity, ready/start authority, illegal/duplicate moves, sanitized broadcasts, rematches, expiry and reconnect snapshots.
- Browser: two independent contexts create/join from the invitation, play to an accurate result, rematch and recover after reload; navigation, responsive controls, offline errors and keyboard accessibility.
- Database: both migrations execute in real embedded PostgreSQL (PGlite) with an emulated Auth schema. Anonymous/cross-user profile, raw-room/invitation, report/block ownership and role/entitlement boundaries are tested. Hosted Supabase Auth, email and environment policy configuration still require separate staging validation.

## Manual release matrix

Test real lower-end Android Chrome, iPhone Safari, desktop Chrome/Firefox/Safari, narrow viewport, large text, keyboard only, screen reader, reduced motion and light mode. Measure bundle size and cold/warm network performance; do not claim Lighthouse or crash-free scores without captured runs. Verify WhatsApp composer behavior on real mobile/desktop devices: an automated check of a share URL does not prove message delivery.

No native-device, store, paid transaction, production load or live Supabase validation is implied by local unit/browser tests.

## Verified local implementation run — 2026-11-07

- Node 24.22.1 / npm 11.9.0 in this workspace.
- Latest `npm test`: **38 passed** (6 provider-contract account tests using a mocked provider, 2 catalog tests, 9 Checkers rules tests, 7 embedded PostgreSQL tests including the parent case, 9 initial-game rule tests and 5 room integration tests).
- Earlier complete `npm run test:e2e` run before the account/Checkers expansion: **10 passed**, Chromium, independent browser contexts. Actual UI match completion for all three games; Tic-Tac-Toe invitation/result/reload/rematch; browser HTTP/WebSocket matches/recovery/rematch for all three; mobile navigation/search/favorites/theme; adult onboarding, invalid invitations and stale session recovery.
- Strict TypeScript, ESLint and Prettier checks pass.
- Production build passes. `npm run check:bundle` records gzip sizes and enforces 140,000-byte JS /30,000-byte CSS aggregate budgets. This is not a network/device performance benchmark.
- `npm audit` (including development tools): **0 reported vulnerabilities** after a targeted minimatch override. Audit results are a point-in-time dependency check, not a security certification.
- Manual visual review of captured 1440px desktop and 390px mobile homepages completed. These are Chromium emulations, not physical-device tests.
- Local gitleaks CLI is unavailable; secret scanning is configured in GitHub Actions but has not run remotely. Hosted Supabase/Auth policies, nginx template, real WhatsApp delivery, app-store/native and real-device screen-reader testing remain unverified.

The first combined browser run overlapped another run against the same development server and hit its shared IP limiter. After stopping the competing runs and starting a fresh server, all 10 tests passed. CI starts its own fresh server; do not run simultaneous suites against the same rate-limited beta instance.

## Expansion verification — 2026-11-07

- `node --import tsx --test tests/database.test.ts`: **7 passed**, including six subtests. Both SQL migrations execute in PGlite's actual embedded PostgreSQL with local `auth.users`/`auth.uid()` emulation. Verified profile isolation/updates, private data and role/entitlement denials, report/block ownership, admin-only disabled catalog visibility, signup adult/name validation and ignored injected roles, and deletion cascades. This is not hosted Supabase or GoTrue/email assurance.
- Checkers independent-browser verification: a complete synchronized match passed, including illegal-move rejection, reload recovery, correct result and rematch. It is now playable in the catalog.
- Targeted browser safety run: **3 passed**, exercising report creation, blocking/future-join denial, unblock and guest denial of admin access.
- Compiled server smoke test (`npm run verify:production`): **passed**, using the emitted Node artifact and actual loopback health/features requests. This is not a public HTTPS deployment test.
- Final expanded `npm run test:e2e`: **13/13 passed** in Chromium (32 seconds). This includes the original browser flows plus Checkers independent-client and safety checks. It supersedes the earlier 10-test count.
- Final complete `npm test`: **38/38 passed**; compiled server build and production smoke passed; full dependency audit reported **0 vulnerabilities**. Aggregate gzip outputs: **92,060 bytes JavaScript** and **8,993 bytes CSS**, below the configured budgets. These are build measurements, not physical-device network benchmarks.
- Hosted Supabase Auth/email, production origin/TLS/nginx, WhatsApp delivery and real-device/native verification remain unperformed.
