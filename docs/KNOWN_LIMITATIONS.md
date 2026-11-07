# Known limitations and launch blockers

- This is a private local beta foundation, not a production-ready global platform.
- Rooms/sessions are in memory: restart loses them; one server replica only. No durable room backup or recovery service exists. Optional provider-backed accounts do not change this.
- Optional Supabase account/profile integration requires authorized server configuration and both reviewed migrations. No hosted project, live Auth/email delivery or production account lifecycle is verified here. Local PostgreSQL policy tests are separate from hosted provider assurance. Guest export/deletion works independently of the optional account service.
- Four games are playable: Tic-Tac-Toe, Four in a Row, Quick Trivia Battle and Checkers. The 20-game target and 5,000-game ambition are roadmap goals.
- Friends, tournaments, persistent leaderboards/achievements, recommendations, durable moderation/audit tools, production analytics and monitoring are not implemented. A backend-authorized private-beta admin interface and ephemeral report/block enforcement exist. Never represent an unavailable screen as an operational service.
- Reporting/blocking and administrator review/catalog changes work in process but vanish on restart. Blocking closes shared rooms and denies later joins; guest identity resets can bypass a guest block. Durable storage, audit, account bans and an operational moderation/support process remain broader-release gates.
- Initial adult-only private testing requires product enforcement and founder/legal review. Self-attestation does not certify age or compliance; global service to minors is blocked pending review.
- No real payments, merchant connection, subscription billing, advertising, native binaries or store publishing.
- Hosting is unprovisioned. Static Pages hosting alone cannot run the Node/WebSocket server. Public deployment requires founder approval, a compatible backend and a completed release review.
- Mobile WhatsApp delivery, real-device accessibility, production concurrency/load, backup restore and legal review require external validation. Automated share-link checks do not establish delivery.
- Review exact automated results in the release report; no test is treated as passed merely because its source exists.
- GitHub write permissions initially blocked publication of the source branch. The founder updated the connection and the beta feature branch was successfully pushed. Public application deployment remains unauthorized.
- PWA shell metadata and static-art caching are included. Offline multiplayer, push notifications, verified installation on iOS/Android and native binaries are not implemented.
- The UI and first four game controls currently ship as a small single bundle. Lazy loading per-game code is a future SDK integration requirement before the catalog expands to larger games.
