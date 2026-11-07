# Release acceptance map

This map distinguishes usable beta flows from planned product scope. Source implementation is not proof of hosted behavior. Check the release test report for exact commands/results. No public/native release is approved by this map.

| Requested screen or flow      | Beta acceptance scope                                                                                                      | Remaining release gate                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1. Landing page               | Browser homepage with brand, game links and private-beta scope                                                             | Real-device/accessibility and public-copy review                                         |
| 2. Gaming homepage            | Four playable game cards, navigation and session controls                                                                  | Persistent personalization/recommendations                                               |
| 3. Discovery catalog          | Filter/search available catalog; favorites saved locally where offered                                                     | Large-catalog pagination, remote metadata moderation and larger-game lazy loading        |
| 4. Game detail                | Rules and create-room action for available games                                                                           | Additional games individually implemented/tested                                         |
| 5. Create game room           | Guest identity, adult self-attestation, selected game and private invitation                                               | Durable room/session persistence and production abuse controls                           |
| 6. Join game room             | Open invitation, enter guest identity, validate token/capacity                                                             | Live mobile invitation delivery validation                                               |
| 7. Waiting lobby              | Member readiness and host-authorized start                                                                                 | Real-device/network interruption matrix                                                  |
| 8. Active game                | Four authoritative rule engines and synchronized client views                                                              | Load/long-duration tests and production persistence                                      |
| 9. Results/rematch            | Accurate rule outcome and unanimous rematch                                                                                | Persistent statistics/achievements                                                       |
| 10. Guest onboarding          | Display name, temporary session and adult attestation                                                                      | Age/region legal review; checkbox is not age verification                                |
| 11. Registration/login        | Implemented optional Supabase account adapter/UI; unavailable without project configuration; local migrations/RLS tested   | Hosted Auth/email/recovery validation; remains unavailable when not configured           |
| 12. Player profile            | Guest/session identity and optional own-account profile API/UI                                                             | Hosted persistent-profile lifecycle validation                                           |
| 13. Friends/invitations       | Private room copy/WhatsApp links; ephemeral player blocking                                                                | Persistent friend graph, friend requests and group game night                            |
| 14. Leaderboards              | Unavailable notice rather than invented rankings                                                                           | Trusted persistent match results and abuse-resistant ranking                             |
| 15. Achievements              | Planned; no persistent rewards implied                                                                                     | Event/award validation and persistence                                                   |
| 16. Settings                  | Theme/motion preferences where offered and guest session controls                                                          | Cross-device account preference persistence                                              |
| 17. Help/support              | Instructions and repository issue link                                                                                     | Founder-approved monitored support channel and incident process                          |
| 18. Privacy/safety            | Private adult beta notices, session export/delete, real ephemeral reporting/blocking                                       | Hosted account rights, durable moderation/blocking, retention/legal review               |
| 19. Admin dashboard           | Implemented backend-authorized report review/catalog controls; unavailable without verified registered admin configuration | Persistent moderation roles/audit, operational staff process and protected UI validation |
| 20. Premium/subscription info | Informational unavailable state; no checkout                                                                               | Merchant approval, tax/refund/terms/policy review and real transaction tests             |

## Cross-cutting acceptance gates

- At least two independent clients must demonstrate create → invite → join → ready → start → validated moves → correct result → rematch → reconnect. A single browser changing sides is insufficient.
- WhatsApp links open a user-controlled composer; no automated messaging, contact scraping or in-chat gameplay.
- Account operations must never expose email/passwords or service-role keys to another player. Optional integration must fail clearly when configuration is missing; do not quietly simulate signup success.
- Blocking/reporting must be described according to actual storage. In-memory enforcement vanishes on restart and cannot substitute for durable moderation/account controls.
- Supabase migrations need actual PostgreSQL policy tests. Local emulation does not establish hosted provider/email/security configuration.
- Public deployment, payments and native publication require separate founder approval. Private local tests cannot authorize any of them.
- No full product “done” claim until critical security, persistence, device, legal and deployment gates have evidence and required approvals.

Optional account/safety API contracts are documented in `apps/server/README.md`. Local provider-contract, PostgreSQL policy and targeted browser safety checks pass; no hosted Auth/email service is marked verified. The final expanded Chromium suite passed 13/13 and local rules/API/database suite passed 38/38; see TESTING.md for the exact limits of that evidence.
