import { useState } from "react";
import {
  legalMoves,
  type CheckersState,
} from "../../../packages/games/src/checkers";
import type { PlayerIndex } from "../../../packages/game-sdk/src/index";

interface Props {
  state: CheckersState;
  playerIndex: PlayerIndex;
  disabled: boolean;
  onMove: (move: { from: number; to: number }) => void;
}
export default function CheckersBoard({
  state,
  playerIndex,
  disabled,
  onMove,
}: Props) {
  const [selection, setSelection] = useState<number | null>(null);
  const moves = legalMoves(state);
  const interactive =
    !disabled && state.turn === playerIndex && state.winner === null;
  const selected =
    state.forcedFrom ??
    (moves.some((move) => move.from === selection) ? selection : null);
  const destinations = moves
    .filter((move) => move.from === selected)
    .map((move) => move.to);
  const mustCapture = moves.some((move) => move.capture !== null);
  function choose(index: number) {
    if (!interactive) return;
    if (selected !== null && destinations.includes(index)) {
      onMove({ from: selected, to: index });
      setSelection(null);
    } else if (moves.some((move) => move.from === index)) setSelection(index);
  }
  return (
    <section
      aria-label="Checkers board"
      style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}
    >
      <p role="status" style={{ textAlign: "center", marginBottom: 12 }}>
        {state.winner !== null
          ? "Match complete."
          : !interactive
            ? "Waiting for your opponent."
            : state.forcedFrom !== null
              ? "Continue jumping with the highlighted piece."
              : mustCapture
                ? "A capture is available and must be taken."
                : selected !== null
                  ? "Choose a highlighted destination."
                  : "Choose one of your pieces, then its destination."}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8,minmax(0,1fr))",
          border: "3px solid #5c6078",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {state.board.map((piece, index) => {
          const dark = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
          const destination = destinations.includes(index);
          const source = moves.some((move) => move.from === index);
          const own = piece?.player === playerIndex;
          return (
            <button
              key={index}
              type="button"
              aria-label={`Square ${index + 1}, ${piece ? `${own ? "your" : "opponent"} ${piece.king ? "king" : "piece"}` : "empty"}${selected === index ? ", selected" : ""}${destination ? ", legal destination" : ""}`}
              aria-pressed={selected === index}
              disabled={!interactive || (!source && !destination)}
              onClick={() => choose(index)}
              style={{
                aspectRatio: "1",
                padding: 3,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border:
                  selected === index
                    ? "3px solid #a3fff0"
                    : "1px solid transparent",
                background: dark ? "#3d4260" : "#d8d5e9",
                cursor:
                  interactive && (source || destination)
                    ? "pointer"
                    : "default",
                opacity: 1,
                minWidth: 0,
                borderRadius: 0,
                outlineOffset: -3,
              }}
            >
              {piece ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: "78%",
                    height: "78%",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(14px,4vw,24px)",
                    fontWeight: 800,
                    color: piece.player === 0 ? "#102521" : "#fff",
                    background: piece.player === 0 ? "#91e7ce" : "#9371da",
                    border: `3px solid ${piece.player === 0 ? "#4ab79a" : "#6244a0"}`,
                    boxShadow: "0 3px 0 #0004",
                  }}
                >
                  {piece.king ? "♛" : piece.player === 0 ? "●" : "○"}
                </span>
              ) : destination ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: "32%",
                    height: "32%",
                    borderRadius: "50%",
                    background: "#a3fff0",
                    border: "2px solid #163c39",
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 13, textAlign: "center", marginTop: 10 }}>
        Your pieces: {playerIndex === 0 ? "mint ●" : "violet ○"}. Kings: ♛.
        Board squares are numbered 1–64.
      </p>
    </section>
  );
}
