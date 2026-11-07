# Beta multiplayer authority

Run `npm run dev:server` from the root (port 3001). The Vite client proxies `/api` and `/ws`. This is a real, single-process, in-memory authority: restarting loses guests, rooms and matches. It is suitable for development and private evaluation, not a production persistence solution. Run one replica only. All moves are validated by shared game rules, serialized synchronously in the Node event loop. Never place a Supabase service key in a client.

## API

Every request body uses `Content-Type: application/json`; authenticated requests use `Authorization: Bearer <session token>`.

- `POST /api/session` `{name,ageConfirmed:true}` → `{token,player:{id,name},expiresAt}`. Private beta is adults only; this checkbox is not verified age assurance or a legal compliance claim.
- `POST /api/rooms` `{gameId}` → `{room,invite}`. Game IDs: `tic-tac-toe`, `four-in-a-row`, `quick-trivia`, `checkers`.
- `POST /api/rooms/:id/join` `{invite}` → `{room}`. Two members maximum. Invitation secrets do not grant control of a member's session.
- `GET /api/rooms/:id` → `{room}`. Members only, suitable for reconnect/poll recovery.
- `POST /api/rooms/:id/action`: `{type:'ready',ready:true}`, `{type:'start'}`, `{type:'move',move:{cell:0}}`, `{type:'move',move:{column:0}}`, `{type:'move',move:{answer:0}}`, or `{type:'rematch'}` → `{room}`.
- `DELETE /api/session`: deletes the guest and closes their rooms.
- `GET /api/session/export`: current guest profile and room summaries.
- `GET /api/health`: readiness and explicit ephemeral storage marker.

Room shape: `{id,gameId,status,hostId,playerIndex,members,game,expiresAt,version,rematchVotes,invite?}`. `members` has `{id,name,ready,connected}`. Only the host receives `invite` in snapshots. Status transitions: waiting → playing → finished → playing (unanimous rematch). Both members must be ready and only the host may start. Disconnect preserves room and session until expiration. Rooms expire two hours after creation; guests expire after 24 hours. HTTP errors return `{error:string}` with appropriate status.

Subscribe at `/ws?room=<id>&token=<session>` for `{type:'room',room}` snapshots. All writes use HTTP, not socket messages. Reconnect and fetch latest state rather than replaying commands. Tokens in socket URLs must be redacted in access logs. Same-origin checks protect browser sockets; a reverse proxy must preserve Host and Origin. Do not enable permissive CORS. IP throttling uses the direct socket address and deliberately does not trust arbitrary forwarded headers; production reverse proxy deployment requires a trusted-proxy design. Requests have a 4KiB limit, clients have rate limits and socket caps. No public chat, contacts scraping or automated messages exist.

## Production gaps

Optional registered authentication is implemented through the Supabase adapter below and requires external configuration and live verification. Distributed room persistence, an audited durable abuse queue, durable blocking and global compliance verification remain incomplete. The private two-player beta uses invitation access control, ephemeral reporting/blocking and session deletion as immediate safety tools. Do not present these gaps as completed features. Before public deployment replace the memory store with database transactions/RLS, configure trusted ingress, durable monitoring, backups and load tests, and complete privacy/legal review. Free static hosting alone cannot run this process; deploy the web and authority behind one HTTPS origin on approved infrastructure.

## Optional accounts and safety API

The optional server-only Supabase REST adapter enables real email/password accounts when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured and the supplied migrations have been applied. `SUPABASE_SERVICE_ROLE_KEY` is optional and enables permanent provider account deletion; never expose it to Vite or browsers. `PLAYNEX_ADMIN_IDS` is a comma-separated allowlist of verified Supabase account UUIDs. Guests can never become administrators. Metadata role fields are ignored. Provider access tokens remain inside the server's session store and never appear in room snapshots. Local registered sessions last at most one hour and require another login after expiration; automatic refresh is not implemented.

- `GET /api/features` → `{accounts, accountDeletion, admin, moderationStorage:'ephemeral'}`. Account flags indicate configuration, not that live provider validation passed.
- `POST /api/auth/signup` `{email,password,name,ageConfirmed:true}` → local session or `{confirmationRequired:true}`. Passwords are 12–128 characters. Signup sends only `display_name` and boolean `age_confirmed` as user metadata.
- `POST /api/auth/login` `{email,password,ageConfirmed:true}` → `{token,player:{id,name,avatar,kind:'registered',admin},expiresAt}`. Provider `/auth/v1/user` verifies identity; client IDs and roles are ignored.
- `POST /api/auth/exchange` `{accessToken,ageConfirmed:true}` exchanges a verified email confirmation/recovery callback token into a local session. The founder must configure approved callback URLs and working email delivery in Supabase.
- `POST /api/auth/recover` `{email}` requests provider email; `POST /api/auth/reset` `{accessToken,password}` verifies the recovery access token, updates the provider password and invalidates local account sessions.
- `POST /api/auth/logout` invalidates local sessions and calls the provider logout endpoint for registered users. `DELETE /api/session` deletes local session data; for registered users it **does not delete the provider account**.
- `GET /api/profile` and `PATCH /api/profile` `{name?,avatar?}` → `{profile:{id,name,avatar,kind}}`. Registered profiles use their own provider bearer and database RLS. Avatars: orbit, comet, nova, moon.
- `DELETE /api/account` permanently deletes the verified account through the provider admin API and then clears local state. Returns 503 without the server-only service credential. Provider identity is rechecked first.
- `GET /api/blocks` → `{blocks:[{playerId,createdAt}]}`; `POST /api/blocks` `{roomId,playerId}` requires both parties be room members. It closes shared rooms immediately and prevents future joins in both directions. `DELETE /api/blocks` `{playerId}` unblocks. Guest identity resets can bypass guest blocks; durable account bans are not implemented.
- `GET /api/reports` returns only own submitted reports; `POST /api/reports` `{roomId,playerId,reason}` requires both parties be current room members and a reason of 10–1000 characters. Submit a report before blocking, since blocking closes the room. Maximum three reports per minute per player.
- Administrator `GET /api/admin` returns ephemeral catalog, reports and counts. `PATCH /api/admin/catalog` `{gameId,enabled}` enforces the flag at room creation. `PATCH /api/admin/reports` `{reportId,status:'open'|'reviewing'|'closed'}` updates moderation status. Each admin request revalidates provider authorization. Administrative changes do not persist across server restarts.

Profile/account data lives in Supabase. Blocks, reports, catalog flags, rooms and sessions remain in memory. Guest data deletion removes their safety records and references; permanent registered deletion does the same after provider success. The current export returns the current profile and local room/block/report data, not a certified complete legal data export. Tests mock the provider contract; live email, provider policies and database RLS still require an authorized configured project and verification before release.
