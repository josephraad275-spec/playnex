import type { PlayerIndex, Winner } from "../../game-sdk/src/index";

export interface CheckersPiece {
  player: PlayerIndex;
  king: boolean;
}
export interface CheckersState {
  gameId: "checkers";
  board: (CheckersPiece | null)[];
  turn: PlayerIndex;
  winner: Winner;
  /** A capture chain must continue with this piece. */
  forcedFrom: number | null;
  /** Draw after 80 consecutive plies without capture or promotion. */
  quietPlies: number;
}
export interface CheckersMove {
  from: number;
  to: number;
  capture: number | null;
}
export function initialCheckersState(): CheckersState {
  const board: CheckersState["board"] = Array<null>(64).fill(null);
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1 && (row < 3 || row > 4))
        board[row * 8 + col] = { player: row < 3 ? 0 : 1, king: false };
    }
  return {
    gameId: "checkers",
    board,
    turn: 0,
    winner: null,
    forcedFrom: null,
    quietPlies: 0,
  };
}
function movesFor(
  state: CheckersState,
  from: number,
  capturesOnly: boolean,
): CheckersMove[] {
  const piece = state.board[from];
  if (!piece || piece.player !== state.turn) return [];
  const row = Math.floor(from / 8),
    col = from % 8;
  const moves: CheckersMove[] = [];
  for (const dy of piece.king ? [-1, 1] : [piece.player === 0 ? 1 : -1])
    for (const dx of [-1, 1]) {
      const y = row + dy,
        x = col + dx;
      if (y < 0 || y > 7 || x < 0 || x > 7) continue;
      const neighbor = state.board[y * 8 + x];
      if (neighbor === null && !capturesOnly)
        moves.push({ from, to: y * 8 + x, capture: null });
      const landingY = row + dy * 2,
        landingX = col + dx * 2;
      if (
        neighbor &&
        neighbor.player !== piece.player &&
        landingY >= 0 &&
        landingY < 8 &&
        landingX >= 0 &&
        landingX < 8 &&
        state.board[landingY * 8 + landingX] === null
      )
        moves.push({ from, to: landingY * 8 + landingX, capture: y * 8 + x });
    }
  return moves;
}
/** Safe client helper: derived only from the public board, with mandatory capture enforcement. */
export function legalMoves(state: CheckersState): CheckersMove[] {
  if (state.winner !== null) return [];
  if (state.forcedFrom !== null) return movesFor(state, state.forcedFrom, true);
  const captures: CheckersMove[] = [],
    steps: CheckersMove[] = [];
  for (let from = 0; from < 64; from++)
    for (const move of movesFor(state, from, false))
      (move.capture !== null ? captures : steps).push(move);
  return captures.length ? captures : steps;
}
/** English draughts: forward-only men, short kings, compulsory captures, crowning ends a turn. */
export function applyCheckersMove(
  state: CheckersState,
  player: PlayerIndex,
  input: unknown,
): CheckersState {
  if (player !== 0 && player !== 1) throw new Error("Invalid player");
  if (state.winner !== null) throw new Error("Match is complete");
  if (player !== state.turn) throw new Error("Wait for your turn");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid move");
  const { from, to } = input as Record<string, unknown>;
  if (
    typeof from !== "number" ||
    typeof to !== "number" ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    from >= 64 ||
    to < 0 ||
    to >= 64
  )
    throw new Error("Invalid move");
  const move = legalMoves(state).find(
    (candidate) => candidate.from === from && candidate.to === to,
  );
  if (!move)
    throw new Error("Illegal move: choose a legal step or mandatory capture");
  const next = structuredClone(state);
  const piece = next.board[from]!;
  next.board[from] = null;
  next.board[to] = piece;
  if (move.capture !== null) next.board[move.capture] = null;
  const promoted = !piece.king && Math.floor(to / 8) === (player === 0 ? 7 : 0);
  if (promoted) piece.king = true;
  next.quietPlies = move.capture !== null || promoted ? 0 : next.quietPlies + 1;
  next.forcedFrom = null;
  if (move.capture !== null && !promoted && movesFor(next, to, true).length) {
    next.forcedFrom = to;
    return next;
  }
  next.turn = player === 0 ? 1 : 0;
  if (!legalMoves(next).length) next.winner = player;
  else if (next.quietPlies >= 80) next.winner = "draw";
  return next;
}
