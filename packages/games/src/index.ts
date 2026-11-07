import {
  initialCheckersState,
  applyCheckersMove,
  type CheckersState,
} from "./checkers";
export type { CheckersState, CheckersPiece, CheckersMove } from "./checkers";
import type { GameId, PlayerIndex, Winner } from "../../game-sdk/src/index";
export type { GameId, PlayerIndex, Winner } from "../../game-sdk/src/index";
export interface BoardState {
  gameId: "tic-tac-toe" | "four-in-a-row";
  turn: PlayerIndex;
  winner: Winner;
  board: (PlayerIndex | null)[];
}
interface Question {
  question: string;
  options: string[];
  correct: number;
}
export interface TriviaState {
  gameId: "quick-trivia";
  turn: PlayerIndex;
  winner: Winner;
  round: number;
  scores: [number, number];
  questions: Question[];
  pending: [number | null, number | null];
}
export interface TriviaView {
  gameId: "quick-trivia";
  turn: PlayerIndex;
  winner: Winner;
  round: number;
  totalRounds: number;
  scores: [number, number];
  question: string;
  options: string[];
}
export type GameState = BoardState | TriviaState | CheckersState;
export type PublicGameState = BoardState | TriviaView | CheckersState;
const QUESTIONS: readonly Question[] = [
  {
    question: "Which planet is known for its prominent rings?",
    options: ["Mars", "Venus", "Saturn", "Mercury"],
    correct: 2,
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["Five", "Six", "Seven", "Eight"],
    correct: 1,
  },
  {
    question: "Which ocean is the largest?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correct: 3,
  },
  {
    question: "Which instrument typically has 88 keys?",
    options: ["Piano", "Flute", "Violin", "Trumpet"],
    correct: 0,
  },
  {
    question: "What is the chemical symbol for oxygen?",
    options: ["Au", "O", "Fe", "C"],
    correct: 1,
  },
  {
    question: "What does a bee collect from flowers to make honey?",
    options: ["Sand", "Salt", "Nectar", "Bark"],
    correct: 2,
  },
  {
    question: "Which number is a prime number?",
    options: ["9", "15", "21", "13"],
    correct: 3,
  },
  {
    question: "Which animal is a mammal?",
    options: ["Dolphin", "Trout", "Butterfly", "Lizard"],
    correct: 0,
  },
  {
    question: "How many minutes are in two hours?",
    options: ["60", "90", "120", "180"],
    correct: 2,
  },
  {
    question:
      "What is the freezing point of water at standard pressure in Celsius?",
    options: ["0", "10", "32", "100"],
    correct: 0,
  },
  {
    question: "Which shape has no corners?",
    options: ["Triangle", "Square", "Circle", "Pentagon"],
    correct: 2,
  },
  {
    question: "Which continent contains Kenya?",
    options: ["Europe", "Africa", "Asia", "South America"],
    correct: 1,
  },
];
export function initialState(gameId: GameId): GameState {
  if (gameId === "checkers") return initialCheckersState();
  if (gameId === "tic-tac-toe" || gameId === "four-in-a-row") {
    return {
      gameId,
      turn: 0,
      winner: null,
      board: Array<null>(gameId === "tic-tac-toe" ? 9 : 42).fill(null),
    };
  }
  if (gameId !== "quick-trivia") throw new Error("Unknown game");
  // Randomness is generated on the server; secrets remain in authoritative state.
  const questions = QUESTIONS.map((q) => ({ ...q, options: [...q.options] }));
  for (let i = questions.length - 1; i > 0; i--) {
    const random = new Uint32Array(1);
    globalThis.crypto.getRandomValues(random);
    const j = (random[0] ?? 0) % (i + 1);
    [questions[i], questions[j]] = [questions[j]!, questions[i]!];
  }
  return {
    gameId,
    turn: 0,
    winner: null,
    round: 0,
    scores: [0, 0],
    questions: questions.slice(0, 6),
    pending: [null, null],
  };
}
function integerField(move: unknown, key: string, max: number): number {
  if (!move || typeof move !== "object" || Array.isArray(move))
    throw new Error("Invalid move");
  const value = (move as Record<string, unknown>)[key];
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value >= max
  )
    throw new Error("Invalid move");
  return value;
}
function hasLine(
  board: (PlayerIndex | null)[],
  columns: number,
  rows: number,
  length: number,
  player: PlayerIndex,
): boolean {
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
      ] as const) {
        const endX = col + dx * (length - 1),
          endY = row + dy * (length - 1);
        if (endX < 0 || endX >= columns || endY < 0 || endY >= rows) continue;
        let match = true;
        for (let n = 0; n < length; n++)
          if (board[(row + dy * n) * columns + col + dx * n] !== player)
            match = false;
        if (match) return true;
      }
    }
  return false;
}
export function applyMove(
  state: GameState,
  player: PlayerIndex,
  move: unknown,
): GameState {
  if (player !== 0 && player !== 1) throw new Error("Invalid player");
  if (state.winner !== null) throw new Error("Match is complete");
  if (state.turn !== player) throw new Error("Wait for your turn");
  if (state.gameId === "checkers")
    return applyCheckersMove(state, player, move);
  const next = structuredClone(state);
  if (next.gameId === "quick-trivia") {
    const question = next.questions[next.round];
    if (!question) throw new Error("No active question");
    const answer = integerField(move, "answer", question.options.length);
    if (next.pending[player] !== null) throw new Error("Already answered");
    next.pending[player] = answer;
    if (next.pending[0] !== null && next.pending[1] !== null) {
      for (const p of [0, 1] as const)
        if (next.pending[p] === question.correct) next.scores[p]++;
      next.round++;
      next.pending = [null, null];
      next.turn = 0;
      if (next.round === next.questions.length)
        next.winner =
          next.scores[0] === next.scores[1]
            ? "draw"
            : next.scores[0] > next.scores[1]
              ? 0
              : 1;
    } else next.turn = player === 0 ? 1 : 0;
    return next;
  }
  const board = next.board;
  if (next.gameId === "tic-tac-toe") {
    const cell = integerField(move, "cell", 9);
    if (board[cell] !== null) throw new Error("Cell is occupied");
    board[cell] = player;
  } else {
    const column = integerField(move, "column", 7);
    let row = 5;
    while (row >= 0 && board[row * 7 + column] !== null) row--;
    if (row < 0) throw new Error("Column is full");
    board[row * 7 + column] = player;
  }
  const tic = next.gameId === "tic-tac-toe";
  next.winner = hasLine(board, tic ? 3 : 7, tic ? 3 : 6, tic ? 3 : 4, player)
    ? player
    : board.every((cell) => cell !== null)
      ? "draw"
      : null;
  next.turn = player === 0 ? 1 : 0;
  return next;
}
export function publicState(
  state: GameState,
  _player: PlayerIndex,
): PublicGameState {
  if (state.gameId !== "quick-trivia") return structuredClone(state);
  const question = state.questions[state.round];
  return {
    gameId: state.gameId,
    turn: state.turn,
    winner: state.winner,
    round: state.round,
    totalRounds: state.questions.length,
    scores: [...state.scores],
    question: question?.question ?? "Match complete",
    options: [...(question?.options ?? [])],
  };
}
