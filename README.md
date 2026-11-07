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
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

## Layout

- `apps/web`: responsive React/Vite PWA and invitation flows.
- `apps/server`: authenticated guest API and WebSocket room authority.
- `apps/mobile`: native packaging evaluation and release prerequisites.
- `packages/game-sdk`: integration types and catalog contract.
- `packages/games`: original Tic-Tac-Toe, Four in a Row, and Quick Trivia rules.
- `packages/ui`: shared accessible UI primitives.
- `packages/shared`: cross-platform constants.
- `supabase/migrations`: future persistent data/RLS foundation, **not wired into the runtime**.
- `tests`: rules, API, and independent-browser checks.
- `docs`: architecture, deployment, budget, security, release gaps, and roadmap.

## Product boundaries

The initial room service keeps data in memory. Restarting it erases guests and matches. Run only one server replica. Registered accounts, friends, achievements, moderation operations, global leaderboards, tournaments, real payments, persistent analytics, and native store releases are not complete. Unavailable features are labeled in the interface. Only the three implemented games are selectable.

WhatsApp invitations use user-initiated official share links. Gameplay runs in a browser; no messages are sent automatically. Device/browser and WhatsApp delivery testing are distinct from local automated link tests.

Do not publicly release until the gates in [Deployment](docs/DEPLOYMENT.md), [Security](docs/SECURITY.md), and [Known limitations](docs/KNOWN_LIMITATIONS.md) are resolved and the founder authorizes publishing. No billable infrastructure has been requested.
