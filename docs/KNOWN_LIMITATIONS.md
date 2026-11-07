# Known limitations and launch blockers

- This is a private local beta foundation, not a production-ready global platform.
- Rooms/sessions are in memory: restart loses them; one server replica only. No durable user data, backup or recovery service exists.
- Supabase migration is prepared but not connected or executed here. Registered-account authentication, persistent profiles, durable account data export/deletion and database RLS require integration and live testing. Ephemeral guest export/deletion exists in the local room API; it is not a registered-account lifecycle.
- Only three initial games are in scope. The 20-game target and 5,000-game ambition are roadmap goals.
- Friends, tournaments, persistent leaderboards/achievements, recommendations, full moderation/admin tools, production analytics and monitoring are not presumed implemented. Never represent an unavailable screen as an operational service.
- Reporting/blocking SQL is not an operational safety workflow. Configure moderation and support before broader social release.
- Initial adult-only private testing requires product enforcement and founder/legal review. Self-attestation does not certify age or compliance; global service to minors is blocked pending review.
- No real payments, merchant connection, subscription billing, advertising, native binaries or store publishing.
- Hosting is unprovisioned. Static Pages hosting alone cannot run the Node/WebSocket server. Public deployment requires founder approval, a compatible backend and a completed release review.
- Mobile WhatsApp delivery, real-device accessibility, production concurrency/load, backup restore and legal review require external validation. Automated share-link checks do not establish delivery.
- Review exact automated results in the release report; no test is treated as passed merely because its source exists.
- GitHub checkout works, but both Git push and GitHub App branch creation returned HTTP403 during implementation. The completed work is committed locally; no remote PR can be claimed until write permissions are corrected.
- PWA shell metadata and static-art caching are included. Offline multiplayer, push notifications, verified installation on iOS/Android and native binaries are not implemented.
- The UI and first three game controls currently ship as a small single bundle. Lazy loading per-game code is a future SDK integration requirement before the catalog expands to larger games.
