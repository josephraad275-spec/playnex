# Beta multiplayer authority

Run `npm run dev:server` from the root (port 3001). The Vite client proxies `/api` and `/ws`. This is a real, single-process, in-memory authority: restarting loses guests, rooms and matches. It is suitable for development and private evaluation, not a production persistence solution. Run one replica only. All moves are validated by shared game rules, serialized synchronously in the Node event loop. Never place a Supabase service key in a client.

## API

Every request body uses `Content-Type: application/json`; authenticated requests use `Authorization: Bearer <session token>`.

- `POST /api/session` `{name,ageConfirmed:true}` → `{token,player:{id,name},expiresAt}`. Private beta is adults only; this checkbox is not verified age assurance or a legal compliance claim.
- `POST /api/rooms` `{gameId}` → `{room,invite}`. Game IDs: `tic-tac-toe`, `four-in-a-row`, `quick-trivia`.
- `POST /api/rooms/:id/join` `{invite}` → `{room}`. Two members maximum. Invitation secrets do not grant control of a member's session.
- `GET /api/rooms/:id` → `{room}`. Members only, suitable for reconnect/poll recovery.
- `POST /api/rooms/:id/action`: `{type:'ready',ready:true}`, `{type:'start'}`, `{type:'move',move:{cell:0}}`, `{type:'move',move:{column:0}}`, `{type:'move',move:{answer:0}}`, or `{type:'rematch'}` → `{room}`.
- `DELETE /api/session`: deletes the guest and closes their rooms.
- `GET /api/session/export`: current guest profile and room summaries.
- `GET /api/health`: readiness and explicit ephemeral storage marker.

Room shape: `{id,gameId,status,hostId,playerIndex,members,game,expiresAt,version,rematchVotes,invite?}`. `members` has `{id,name,ready,connected}`. Only the host receives `invite` in snapshots. Status transitions: waiting → playing → finished → playing (unanimous rematch). Both members must be ready and only the host may start. Disconnect preserves room and session until expiration. Rooms expire two hours after creation; guests expire after 24 hours. HTTP errors return `{error:string}` with appropriate status.

Subscribe at `/ws?room=<id>&token=<session>` for `{type:'room',room}` snapshots. All writes use HTTP, not socket messages. Reconnect and fetch latest state rather than replaying commands. Tokens in socket URLs must be redacted in access logs. Same-origin checks protect browser sockets; a reverse proxy must preserve Host and Origin. Do not enable permissive CORS. IP throttling uses the direct socket address and deliberately does not trust arbitrary forwarded headers; production reverse proxy deployment requires a trusted-proxy design. Requests have a 4KiB limit, clients have rate limits and socket caps. No public chat, contacts scraping or automated messages exist.

## Production gaps

No registered account authentication, distributed persistence, audited abuse queue, durable blocking or global compliance verification yet. The private two-player beta uses invitation access control and session deletion/room closure as immediate safety exits. Do not present these gaps as completed features. Before public deployment replace the memory store with database transactions/RLS, configure trusted ingress, durable monitoring, backups and load tests, and complete privacy/legal review. Free static hosting alone cannot run this process; deploy the web and authority behind one HTTPS origin on approved infrastructure.
