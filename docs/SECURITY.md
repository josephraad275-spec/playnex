# Security and safety

## Trust model

Treat display names, invitations and game moves as untrusted input. Only the backend may change room state. Membership, seat, turn, phase, capacity and move legality must be checked for every action. Cryptographically random guest/invitation tokens are bearer credentials; HTTPS is required outside localhost. Invitation sharing intentionally discloses a join capability.

Session tokens must not be embedded in shared room invitations. WebSocket credentials in query strings require query-redacting proxy/access logs; a future production implementation should prefer a short-lived connection ticket or appropriate secure cookie. Avoid XSS: render user text as text, use no arbitrary HTML, and restrict production script sources. Rate limiting in one process is not a distributed anti-abuse system.

## Database boundary

Supabase migrations support the optional account foundation and proposed room persistence; no hosted Supabase project is configured or verified here. Local embedded PostgreSQL policy tests use an emulated Auth schema and cannot establish hosted Auth/email behavior. RLS is enabled for user data. Clients cannot write rooms, membership, invitation hashes, administrative roles or entitlements. Raw room state has no client SELECT grant. A trusted server must project safe snapshots and serialize operations transactionally. Column grants prevent clients from changing report status or entitlement state. The profile-creation trigger validates display metadata and strict adult self-attestation, records server time and ignores role metadata; direct client profile creation is revoked by migration 002. User-provided role claims must never grant admin access.

## Initial age/safety policy

Restrict initial private testing to adults 18+ pending regional legal review. Self-attestation is not age verification and cannot establish legal compliance. Do not launch to children or globally on the strength of a checkbox. No open messaging, voice, precise location, gambling or targeted ads are needed for the beta. Full reporting, blocking, account deletion/export and an operational moderation process are release gates when accounts/social features are activated.

## Reporting and response

No founder support address has been configured. Do not present an invented address as an operational reporting channel. Before public launch establish a monitored contact, triage owner, response process, retention schedule and incident recovery plan. Logs should use bounded error codes, avoid tokens/answers/personal data, and expire promptly. No third-party monitoring is configured by default.

## Required follow-up

Test cross-user room access, forged seats, concurrent turns, oversized payloads, brute-force limits, expired tokens, WebSocket origin handling and hidden answers. Run production dependency auditing and review findings. Add secret scanning where GitHub account features permit. No security audit or legal certification is claimed.
