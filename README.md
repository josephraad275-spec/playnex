# PlayNex

A browser-first social gaming platform, currently an **unreleased private adult beta**. This repository contains working game rules, a React interface, and an authoritative single-process multiplayer server. It is not a production service and has not been publicly deployed.

## Start locally

Requires Node.js 22+ and npm. No paid accounts or secrets are needed for local gameplay.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 in two independent browser profiles. Create a guest (18+ private beta), choose a game, create a room and open its invitation in the second profile. Ready both players and start as host. Invitations only work on devices that can reach the configured host; a localhost link cannot connect a second phone.

```sh
npm test
npm run lint
npm run format:check
npm run build
npm run verify:production
npm run check:bundle
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

## Layout

- `apps/web`: responsive React/Vite PWA and invitation flows.
- `apps/server`: authenticated guest API and WebSocket room authority.
- `apps/mobile`: native packaging evaluation and release prerequisites.
- `packages/game-sdk`: integration types and catalog contract.
- `packages/games`: original Tic-Tac-Toe, Four in a Row, Quick Trivia, and Checkers rules.
- `packages/ui`: shared accessible UI primitives.
- `packages/shared`: cross-platform constants.
- `supabase/migrations`: account/profile lifecycle and RLS migrations for the optional Supabase account integration. Room state is still in memory.
- `tests`: rules, API, and independent-browser checks.
- `docs`: architecture, deployment, budget, security, release gaps, and roadmap.

## Optional configuration and compiled server

Local guest play needs no configuration. Copy `.env.example` to `.env` only when connecting a reviewed Supabase project. The development server loads `.env`; never commit it or share service-role keys. After `npm run build`, `npm run start:server` runs the compiled authority from `apps/server/dist/index.mjs`. The client build is in `apps/web/dist`; route `/api` and `/ws` to the authority using the documented same-origin HTTPS reverse proxy. Nothing is deployed by these build commands.

## Product boundaries

The initial room service keeps data in memory. Restarting it erases guests and matches. Run only one server replica. Four games are playable, including Checkers with mandatory captures and kings. Reporting/blocking, guest profile editing, and a backend-authorized admin review/catalog panel are implemented, but moderation data remains temporary.

Optional Supabase account code includes registration, login, recovery, profile editing, logout, export and configured permanent deletion. No Supabase project is connected: these account flows remain unavailable until server configuration and migrations are applied, and live email/account verification remains outstanding. See [Account setup](docs/ACCOUNT_SETUP.md). Registered account data can persist in Supabase; game rooms, room sessions, reports and blocks still do not survive server restart.

Friends, achievements, global leaderboards, tournaments, real payments, persistent analytics, durable moderation and native store releases remain incomplete. Unavailable features are labeled in the interface. The full 20-screen acceptance map is in [Release acceptance](docs/RELEASE_ACCEPTANCE.md).

WhatsApp invitations use user-initiated official share links. Gameplay runs in a browser; no messages are sent automatically. Device/browser and WhatsApp delivery testing are distinct from local automated link tests.

Do not publicly release until the gates in [Deployment](docs/DEPLOYMENT.md), [Security](docs/SECURITY.md), and [Known limitations](docs/KNOWN_LIMITATIONS.md) are resolved and the founder authorizes publishing. No billable infrastructure has been requested.
