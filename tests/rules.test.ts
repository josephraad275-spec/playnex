import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  applyMove,
  publicState,
  type BoardState,
  type GameState,
  type TriviaState,
} from "../packages/games/src/index";

test("tic-tac-toe enforces turns, occupied cells, integer bounds, and immutable moves", () => {
  const state = initialState("tic-tac-toe");
  assert.throws(() => applyMove(state, 1, { cell: 0 }), /turn/);
  for (const move of [
    null,
    {},
    { cell: -1 },
    { cell: 9 },
    { cell: 0.5 },
    { cell: "0" },
    [],
  ])
    assert.throws(() => applyMove(state, 0, move));
  const next = applyMove(state, 0, { cell: 0 }) as BoardState;
  assert.equal((state as BoardState).board[0], null);
  assert.equal(next.board[0], 0);
  assert.throws(() => applyMove(next, 1, { cell: 0 }), /occupied/);
});

test("tic-tac-toe detects each of eight winning lines", () => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const line of lines) {
    const state = initialState("tic-tac-toe") as BoardState;
    state.board[line[0]!] = 0;
    state.board[line[1]!] = 0;
    const result = applyMove(state, 0, { cell: line[2] });
    assert.equal(result.winner, 0);
    assert.throws(() => applyMove(result, 1, { cell: 8 }), /complete/);
  }
});

test("tic-tac-toe draw completes with no winner", () => {
  let state = initialState("tic-tac-toe");
  for (const [i, cell] of [0, 1, 2, 4, 3, 5, 7, 6, 8].entries())
    state = applyMove(state, (i % 2) as 0 | 1, { cell });
  assert.equal(state.winner, "draw");
});

test("four-in-a-row applies gravity and prevents full-column or invalid moves", () => {
  let state = initialState("four-in-a-row");
  for (const [i, column] of [2, 2, 2, 2, 2, 2].entries())
    state = applyMove(state, (i % 2) as 0 | 1, { column });
  assert.equal((state as BoardState).board[2], 1);
  assert.equal((state as BoardState).board[37], 0);
  assert.throws(() => applyMove(state, 0, { column: 2 }), /full/);
  assert.throws(() => applyMove(state, 0, { column: 7 }), /Invalid/);
});

test("four-in-a-row detects horizontal, vertical and both diagonal wins without wrapping", () => {
  for (const [prefix, cell] of [
    [[35, 36, 37], 38],
    [[35, 28, 21], 14],
    [[35, 29, 23], 17],
    [[38, 30, 22], 14],
  ] as [number[], number][]) {
    const state = initialState("four-in-a-row") as BoardState;
    for (const index of prefix) state.board[index] = 0;
    // Support the winning token so its landing cell is the intended row.
    for (let index = cell + 7; index < 42; index += 7)
      if (state.board[index] === null) state.board[index] = 1;
    assert.equal(applyMove(state, 0, { column: cell % 7 }).winner, 0);
  }
  const state = initialState("four-in-a-row") as BoardState;
  state.board[33] = 0;
  state.board[34] = 0;
  state.board[35] = 0;
  assert.equal(applyMove(state, 0, { column: 1 }).winner, null);
});

test("trivia reveals neither answers, pending responses, nor future questions", () => {
  const state = initialState("quick-trivia") as TriviaState;
  const first = state.questions[0]!;
  const next = applyMove(state, 0, { answer: first.correct }) as TriviaState;
  assert.deepEqual(next.scores, [0, 0]);
  assert.deepEqual(state.pending, [null, null]);
  const view = publicState(next, 1);
  for (const secret of ["correct", "questions", "pending"])
    assert.equal(secret in view, false);
  assert.equal(view.gameId, "quick-trivia");
  assert.throws(() => applyMove(next, 0, { answer: first.correct }), /turn/);
  assert.throws(() => applyMove(next, 1, { answer: 4 }), /Invalid/);
});

function finishTrivia(
  answerFor: (state: TriviaState, player: 0 | 1) => number,
): GameState {
  let state = initialState("quick-trivia") as TriviaState;
  for (let round = 0; round < 6; round++)
    for (const player of [0, 1] as const)
      state = applyMove(state, player, {
        answer: answerFor(state, player),
      }) as TriviaState;
  return state;
}
test("trivia scores correct answers, decides winner, stops after six questions", () => {
  const state = finishTrivia(
    (s, p) => (s.questions[s.round]!.correct + p) % 4,
  ) as TriviaState;
  assert.deepEqual(state.scores, [6, 0]);
  assert.equal(state.winner, 0);
  assert.equal(state.round, 6);
  assert.throws(() => applyMove(state, 0, { answer: 0 }), /complete/);
  const view = publicState(state, 0);
  if (view.gameId === "quick-trivia") assert.deepEqual(view.options, []);
});
test("trivia handles draws and either player winning", () => {
  assert.equal(
    finishTrivia((s) => s.questions[s.round]!.correct).winner,
    "draw",
  );
  assert.equal(
    finishTrivia((s, p) => (s.questions[s.round]!.correct + 1 - p) % 4).winner,
    1,
  );
});

test("public board views are detached from authoritative state", () => {
  const state = initialState("tic-tac-toe");
  const view = publicState(state, 0) as BoardState;
  view.board[0] = 1;
  assert.equal((state as BoardState).board[0], null);
});
