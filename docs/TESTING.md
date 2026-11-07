# Testing and evidence

Run checks from SETUP.md. Actual results belong in the release PR or this document after execution. This file defines expected coverage; it does not certify that a check passed.

## Required automated coverage

- Rule engines: valid moves, rejected moves, turns, wins/draws, full boards, trivia scoring/completion and sanitized answers.
- Room integration: independent guest identities, private invitation validation, capacity, ready/start authority, illegal/duplicate moves, sanitized broadcasts, rematches, expiry and reconnect snapshots.
- Browser: two independent contexts create/join from the invitation, play to an accurate result, rematch and recover after reload; navigation, responsive controls, offline errors and keyboard accessibility.
- Future Supabase: execute migrations and database policy tests with anonymous and two authenticated users. Deny raw room/invitation data, unauthorized profile/report/block access, and role/entitlement self-grants. These cannot be considered tested without a running PostgreSQL/Supabase instance.

## Manual release matrix

Test real lower-end Android Chrome, iPhone Safari, desktop Chrome/Firefox/Safari, narrow viewport, large text, keyboard only, screen reader, reduced motion and light mode. Measure bundle size and cold/warm network performance; do not claim Lighthouse or crash-free scores without captured runs. Verify WhatsApp composer behavior on real mobile/desktop devices: an automated check of a share URL does not prove message delivery.

No native-device, store, paid transaction, production load or live Supabase validation is implied by local unit/browser tests.

## Verified local implementation run — 2026-11-07

- Node 24.22.1 / npm 11.9.0 in this workspace.
- `npm test`: **16 passed** (2 registry, 9 rules, 5 server integration tests).
- `npm run test:e2e`: **10 passed**, Chromium, independent browser contexts. Actual UI match completion for all three games; Tic-Tac-Toe invitation/result/reload/rematch; browser HTTP/WebSocket matches/recovery/rematch for all three; mobile navigation/search/favorites/theme; adult onboarding, invalid invitations and stale session recovery.
- Strict TypeScript, ESLint and Prettier checks pass.
- Production build passes. `npm run check:bundle` records gzip sizes and enforces 140,000-byte JS /30,000-byte CSS aggregate budgets. This is not a network/device performance benchmark.
- `npm audit` (including development tools): **0 reported vulnerabilities** after a targeted minimatch override. Audit results are a point-in-time dependency check, not a security certification.
- Manual visual review of captured 1440px desktop and 390px mobile homepages completed. These are Chromium emulations, not physical-device tests.
- Local gitleaks CLI is unavailable; secret scanning is configured in GitHub Actions but has not run remotely. Live Supabase/RLS, nginx template, real WhatsApp delivery, app-store/native and real-device screen-reader testing remain unverified.

The first combined browser run overlapped another run against the same development server and hit its shared IP limiter. After stopping the competing runs and starting a fresh server, all 10 tests passed. CI starts its own fresh server; do not run simultaneous suites against the same rate-limited beta instance.
