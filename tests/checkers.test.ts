import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  applyMove,
  publicState,
} from "../packages/games/src/index";
import {
  initialCheckersState,
  applyCheckersMove,
  legalMoves,
  type CheckersState,
} from "../packages/games/src/checkers";
function empty(turn: 0 | 1 = 0): CheckersState {
  return { ...initialCheckersState(), board: Array<null>(64).fill(null), turn };
}
function put(s: CheckersState, index: number, player: 0 | 1, king = false) {
  s.board[index] = { player, king };
}

test("checkers starts with twelve pieces per player on dark squares and seven legal opening moves", () => {
  const s = initialState("checkers") as CheckersState;
  assert.equal(s.board.filter((p) => p?.player === 0).length, 12);
  assert.equal(s.board.filter((p) => p?.player === 1).length, 12);
  for (const [i, p] of s.board.entries())
    if (p) assert.equal((Math.floor(i / 8) + (i % 8)) % 2, 1);
  assert.equal(legalMoves(s).length, 7);
  const next = applyMove(s, 0, { from: 17, to: 24 }) as CheckersState;
  assert.deepEqual(s.board[17], { player: 0, king: false });
  assert.equal(next.board[17], null);
  assert.equal(next.board[24]?.player, 0);
  assert.equal(next.turn, 1);
});
test("checkers rejects bad coordinates, wrong players, occupied squares and backwards men", () => {
  const s = initialCheckersState();
  for (const input of [
    null,
    [],
    {},
    { from: -1, to: 24 },
    { from: 17, to: 64 },
    { from: 17.5, to: 24 },
    { from: "17", to: 24 },
    { from: 40, to: 33 },
    { from: 17, to: 10 },
    { from: 17, to: 19 },
  ])
    assert.throws(() => applyCheckersMove(s, 0, input));
  assert.throws(() => applyCheckersMove(s, 1, { from: 40, to: 33 }), /turn/);
});
test("any available capture makes all ordinary steps illegal", () => {
  const s = empty();
  put(s, 17, 0);
  put(s, 21, 0);
  put(s, 26, 1);
  put(s, 62, 1);
  assert.deepEqual(legalMoves(s), [{ from: 17, to: 35, capture: 26 }]);
  assert.throws(
    () => applyCheckersMove(s, 0, { from: 21, to: 28 }),
    /mandatory capture/,
  );
  const next = applyCheckersMove(s, 0, { from: 17, to: 35 });
  assert.equal(next.board[26], null);
  assert.equal(next.turn, 1);
  assert.equal(next.quietPlies, 0);
});
test("capture chains retain the turn and force the same piece until exhausted", () => {
  const s = empty();
  put(s, 17, 0);
  put(s, 21, 0);
  put(s, 26, 1);
  put(s, 44, 1);
  put(s, 62, 1);
  const first = applyCheckersMove(s, 0, { from: 17, to: 35 });
  assert.equal(first.turn, 0);
  assert.equal(first.forcedFrom, 35);
  assert.deepEqual(legalMoves(first), [{ from: 35, to: 53, capture: 44 }]);
  assert.throws(() => applyCheckersMove(first, 0, { from: 21, to: 28 }));
  assert.throws(
    () => applyCheckersMove(first, 1, { from: 62, to: 55 }),
    /turn/,
  );
  const last = applyCheckersMove(first, 0, { from: 35, to: 53 });
  assert.equal(last.board[44], null);
  assert.equal(last.forcedFrom, null);
  assert.equal(last.turn, 1);
});
test("kings can step and capture backwards but cannot fly", () => {
  const s = empty();
  put(s, 35, 0, true);
  put(s, 26, 1);
  put(s, 62, 1);
  assert.deepEqual(legalMoves(s), [{ from: 35, to: 17, capture: 26 }]);
  const next = applyCheckersMove(s, 0, { from: 35, to: 17 });
  assert.equal(next.board[17]?.king, true);
  const steps = empty();
  put(steps, 35, 0, true);
  put(steps, 62, 1);
  assert.equal(legalMoves(steps).length, 4);
  assert.throws(() => applyCheckersMove(steps, 0, { from: 35, to: 8 }));
});
test("promotion ends a capture turn even when the new king could jump backwards", () => {
  const s = empty();
  put(s, 42, 0);
  put(s, 51, 1);
  put(s, 53, 1);
  const next = applyCheckersMove(s, 0, { from: 42, to: 60 });
  assert.deepEqual(next.board[60], { player: 0, king: true });
  assert.equal(next.turn, 1);
  assert.equal(next.forcedFrom, null);
  assert.equal(next.winner, null);
});
test("no remaining opponent pieces or legal moves loses; terminal states reject moves", () => {
  const s = empty();
  put(s, 17, 0);
  put(s, 26, 1);
  const won = applyCheckersMove(s, 0, { from: 17, to: 35 });
  assert.equal(won.winner, 0);
  assert.deepEqual(legalMoves(won), []);
  assert.throws(
    () => applyCheckersMove(won, 1, { from: 26, to: 19 }),
    /complete/,
  );
  const blocked = empty();
  put(blocked, 17, 0);
  put(blocked, 1, 1);
  assert.equal(applyCheckersMove(blocked, 0, { from: 17, to: 24 }).winner, 0);
  const other = empty(1);
  put(other, 46, 1);
  put(other, 37, 0);
  assert.equal(applyCheckersMove(other, 1, { from: 46, to: 28 }).winner, 1);
});
test("draw after exactly 80 quiet plies; capture or promotion resets counter", () => {
  const s = empty();
  put(s, 1, 0, true);
  put(s, 62, 1, true);
  s.quietPlies = 79;
  assert.equal(applyCheckersMove(s, 0, { from: 1, to: 8 }).winner, "draw");
  s.quietPlies = 78;
  const before = applyCheckersMove(s, 0, { from: 1, to: 8 });
  assert.equal(before.winner, null);
  assert.equal(before.quietPlies, 79);
  const promotion = empty();
  put(promotion, 49, 0);
  put(promotion, 3, 1, true);
  promotion.quietPlies = 79;
  const crown = applyCheckersMove(promotion, 0, { from: 49, to: 56 });
  assert.equal(crown.quietPlies, 0);
  assert.equal(crown.winner, null);
  const capture = empty();
  put(capture, 17, 0);
  put(capture, 26, 1);
  put(capture, 62, 1);
  capture.quietPlies = 79;
  const jumped = applyCheckersMove(capture, 0, { from: 17, to: 35 });
  assert.equal(jumped.quietPlies, 0);
  assert.equal(jumped.winner, null);
});
test("public checker state is detached from authoritative state", () => {
  const s = initialState("checkers");
  const view = publicState(s, 0) as CheckersState;
  view.board[1]!.king = true;
  assert.equal((s as CheckersState).board[1]!.king, false);
});
