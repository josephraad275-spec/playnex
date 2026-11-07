# Deployment guide — approval required

No public deployment is authorized by this repository. Prepare and test staging first; ask the founder to approve an identified release before publishing. No paid services, accounts or upgrades may be activated without explicit approval.

## Current runtime

1. Run `npm ci`, checks, tests and `npm run build` in CI.
2. Serve the generated Vite `apps/web/dist` directory on a compatible static HTTPS host, with SPA navigation fallback.
3. Build the server using `npm run build:server` (included in `npm run build`), producing `apps/server/dist/index.mjs`. On the runtime host install locked production dependencies using `npm ci --omit=dev`, retain the compiled artifact, and run `npm run start:server`. No TypeScript runtime or build tools are required on that host. Run `npm run verify:production` against the compiled artifact before promotion. Keep one replica until persistence is implemented.
4. Configure an HTTPS reverse proxy that routes `/api/*` and WebSocket `/ws` to the same server. Forward upgrades, retain TLS, and configure the server's accepted origin if offered. Do not cache API responses or invitation URLs. Do not log session credentials or URL query strings.
5. Test two independent external browsers, copied and WhatsApp-composed invitations, valid/invalid moves, disconnect/rejoin, expiry and rematch on the real staging origin.
6. Review privacy, safety, abuse handling, availability, dependency findings and KNOWN_LIMITATIONS before requesting public release.

Cloudflare Pages can serve the static client but cannot by itself run this Node/ws backend. Do not claim a working multiplayer deployment after uploading only static assets. Choose a free compatible backend host only after reviewing its current quotas, WebSocket support, sleep policy, data region and spending controls. No host has been provisioned or benchmarked here.

## Private staging reverse-proxy template

`docs/deploy/nginx.conf` is an uninstalled HTTPS configuration template, included from nginx's `http {}` context. It serves `/srv/playnex/apps/web/dist`, proxies `/api/` and `/ws` to `127.0.0.1:3001`, and preserves the original Host and Origin required by the server's WebSocket same-origin check. Replace the reserved `playnex.example.invalid` hostname in **both** `server_name` and CSP, set existing authorized certificate/key paths, and point `root` at the actual build output. It has not been run or syntax-validated here.

After infrastructure and release authorization, validate the completed config with `nginx -t` before reload; test `/api/health`, SPA routes, service worker registration, styles and WebSocket upgrades on that HTTPS hostname. The template deliberately defines no public HTTP listener or certificate purchase/issuance step. Use existing approved TLS provisioning and restrict private staging ingress to invited testers; this template itself supplies no VPN or access gate. Do not insert basic-auth credentials into shared invitation URLs.

The CSP permits same-origin assets and the exact configured WebSocket origin, disallows inline scripts/styles and framing, and disables camera/microphone/geolocation. Referrers are suppressed and responses use conservative `no-store` caching. This is a production-build template: Vite development/HMR may require different policies and must not be exposed publicly. Safe access logging omits query strings, tokens and referrers. Request error logging is disabled because nginx upstream errors can echo full WebSocket credential URLs; configure token-free health/error monitoring separately. Ensure platform/load-balancer logs also redact query strings.

The current server deliberately trusts only the direct socket address for rate limits. Behind this proxy all users share its loopback identity and therefore its aggregate throttle; this is a documented **private evaluation limitation**, not per-user production abuse protection. Do not solve it by blindly trusting incoming `X-Forwarded-For`. A reviewed trusted-proxy/rate-limit design and network restriction on server port 3001 are required before public launch. The server currently binds `0.0.0.0`; configure the host firewall/container ingress so only nginx can reach port 3001. Raw rooms/sessions remain ephemeral even with this template.

## Future persistent release

Founder action: authorize hosting/Supabase accounts and reviewed scopes; enter secrets using provider secret settings; approve domain/DNS if desired; approve legal text and age/region launch scope. Apply reviewed migrations to staging, validate RLS, backups and deletion, then prepare production. Never send secret values through chat.

## Recovery and rollback

The current in-memory server has no durable backup: restart loses rooms and sessions. Tell beta testers this before admission. Preserve prior static artifact and server commit for rollback; deploy them together to avoid protocol mismatch. Persistent release needs scheduled provider backups, a verified restore drill and migration-specific rollback/forward-fix procedures before launch. Never undo schema changes by deleting user data without a reviewed recovery plan.
