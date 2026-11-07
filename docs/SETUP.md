# Local development

Use Node.js 22 or later and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite runs the client and proxies `/api` and `/ws` to the local server (default port 3001). Use two separate browser contexts to test independent guests. They must use the same reachable application origin to share a room.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:production
npx playwright install chromium
npm run test:e2e
npm run audit
```

Playwright browser installation downloads tooling; it does not publish the app. The server defaults to port 3001 (`PORT` overrides it, but the Vite proxy must then match). `POST /api/session` requires `{name,ageConfirmed:true}`; this attestation is not verified age assurance. `GET /api/health` describes the ephemeral runtime. No paid account or Supabase key is needed for the in-memory beta. No production secrets belong in `.env` files committed to Git. `VITE_` values are public bundle contents.

For persistence preparation, read `supabase/README.md`. Do not apply unreviewed migrations to an existing live database. Native work is described under `apps/mobile` and STORE_RELEASE.md.

## Compiled runtime

`npm run build` validates TypeScript and generates `apps/web/dist` plus `apps/server/dist/index.mjs`. `npm run verify:production` smoke-tests the compiled authority on loopback. A runtime-only host can install `npm ci --omit=dev` after artifacts are built and run `npm run start:server`; esbuild, tsx and PGlite are development dependencies and are not needed to serve the built app. Development uses `npm run dev:server`; both server commands load `.env` when present using Node's `--env-file-if-exists`. Copy `.env.example` only into an ignored local `.env` or use authorized host secret settings; do not commit values.

Optional accounts and backend-authorized administration are documented in ACCOUNT_SETUP.md and `apps/server/README.md`. Feature flags indicate configuration, not observed hosted-service readiness.
