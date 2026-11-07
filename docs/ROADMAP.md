# Roadmap and release gates

1. Foundation: strict TypeScript monorepo, accessible responsive client, catalog, tooling and CI.
2. Playable beta: four rule engines, private two-player rooms, guest authority, invitations, independent-client synchronization, results, rematch and recovery checks.
3. Persistence and identity: optional Supabase account/profile adapter and local PostgreSQL RLS checks are implemented; hosted Auth/email verification, durable transactional rooms, complete account-rights workflows, invitation revocation and durable moderation remain gates.
4. Private release candidate: deployment staging, accessibility and device testing, expiry/load/abuse testing, error monitoring, privacy/legal review and founder acceptance.
5. Public release: only after explicit founder approval and critical gates pass.
6. Expansion: Checkers has passed a full independent-browser match/result/reload/rematch and is playable. Draw & Guess is next, followed by Chess, Reversi, Crazy Eights, Memory Match, Word Duel, Reaction Race, Tap Battle, Mini Kart Race, Arena Dodge, Target Challenge, Sudoku Sprint, Word Search Race, Sliding Puzzle, Number Duel and Emoji Guess. Games beyond the first four are proposed catalog entries, not released games.
7. Social: friends/challenges, permitted analytics, achievements and tournaments after abuse controls and retention policies.
8. Mobile: Capacitor evaluation, platform policies, real-device tests, signing and founder-authorized store submission.

The initial beta is not complete merely because source files exist. Keep actual check results in TESTING.md or the release PR, and unresolved gaps in KNOWN_LIMITATIONS.md.
