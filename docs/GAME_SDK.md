# Game integration contract

The first games live in `packages/games`; shared contracts live in `packages/game-sdk`. Inspect exported TypeScript types as the source of truth.

Every game needs stable ID/version, title/description/category, player bounds, age guidance, license/developer, artwork reference, monetization, availability, languages and supported devices. Only mark availability as playable after rules and independent-client tests pass. Future catalog entries must remain visibly unavailable.

The authoritative rules contract creates initial state, validates and applies a move for a player seat, and projects a public state. Rule functions must not trust client identity or timestamps. The room layer supplies the verified player seat and serializes actions. Games must emit an explicit win/loss/draw or completion result and create fresh state on rematch.

Current proposed moves: Tic-Tac-Toe `{cell: number}`, Four in a Row `{column: number}`, Quick Trivia `{answer: number}`. The engine rejects malformed, out-of-range, occupied and out-of-turn actions. Trivia answer keys remain server-only. A client UI renders a sanitized view and sends intent; it cannot award itself a score.

Add a new game by implementing pure rules, rule tests, sanitized projection, accessible UI and registry metadata, then run integration/browser tests before enabling it. Lazy-load substantial game bundles and assets. Phaser is optional for future suitable games, not required for simple boards. Original game assets and dependency license review are mandatory.

## Checkers expansion candidate

Checkers is enabled after a complete independent-browser match with synchronization, illegal-move rejection, reload recovery, results and rematch passed. Its move is `{from: number, to: number}` using zero-based 8×8 indices. The chosen English-draughts variant has forward-only men, short-range kings, mandatory captures and same-piece multi-jumps; crowning ends the turn. A player with no pieces or legal moves loses. The beta uses an automatic draw after 80 consecutive plies without a capture/promotion; threefold repetition is not implemented. State these variant rules rather than suggesting every official tournament rule is covered.
