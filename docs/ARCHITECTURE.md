# Architecture

## Current private beta

A TypeScript monorepo contains a React/Vite browser client, shared game rules and SDK, and one Node HTTP/WebSocket authoritative room server. Vite proxies `/api` and `/ws` locally. The server owns turns, validates moves and membership, and publishes sanitized snapshots. Browser state is presentation, never authority. Trivia answers must never be included in client snapshots.

The beta stores rooms and guest sessions in server memory. A process restart loses them. It supports one server process only: multiple replicas would disagree. This is a deliberate local beta boundary, not scalable production persistence. Guest credentials confer session authority and must not appear in analytics or logs. Rooms expire two hours after creation and guest sessions after 24 hours. Guests can export their current session summary or delete the guest session (closing its rooms); neither is a persistent registered-account service. The server API is documented in `apps/server/README.md`.

## Optional identity and planned room persistence

An optional server-side Supabase REST adapter is implemented for registered-account authentication and own-profile storage. It is unavailable without an authorized configured project; guest play remains independent. `docs/ACCOUNT_SETUP.md` describes server-only configuration and migration requirements. Live Auth/email delivery and hosted project configuration are not established by adapter tests or local SQL checks.

The migrations contain the account-profile trigger and a future room persistence foundation. Room gameplay has not been moved into PostgreSQL: doing so still requires reviewed transactional row locks/version checks, authenticated realtime delivery, retention and recovery validation. Frontend code must never receive service-role credentials or full private game state.

## Growth boundary

A registry and lazy game loading support catalog growth without loading every game at startup. Hosting thousands of metadata records is different from operating thousands of games; asset delivery, compatibility, licensing, moderation and observability remain per-game work. Competitive games need server authority. No microservices are required until measured load justifies them.

## Hosting

Static client assets can use Cloudflare Pages or equivalent. A persistent Node/WebSocket server needs a compatible host or an explicit adapter such as Durable Objects; Pages static hosting alone cannot run it. Production should expose a single HTTPS origin/reverse proxy for API and WebSocket traffic.

## Dependency security decision

A targeted npm override pins the TypeScript ESLint parser's transitive minimatch to `^11.0.1` to address GHSA-g3hv-75wg-m249. Lint, strict typechecking and the full build were validated with the override. Keep it reviewed when upgrading the lint toolchain; the lockfile captures the resolved release.
