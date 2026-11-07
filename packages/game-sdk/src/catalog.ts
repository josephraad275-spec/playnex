import type { GameMetadata } from "./index";

/** Public discovery data only. Game engines and private trivia answers never enter this module. */
const entries: Pick<
  GameMetadata,
  | "id"
  | "title"
  | "description"
  | "category"
  | "availability"
  | "minPlayers"
  | "maxPlayers"
>[] = [
  {
    id: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    category: "Board & strategy",
    description:
      "Three in a row. A quick contest of patterns and friendly rivalry.",
    availability: "playable",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "four-in-a-row",
    title: "Four in a Row",
    category: "Board & strategy",
    description: "Drop a disc, spot the pattern, and think one move ahead.",
    availability: "playable",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "quick-trivia",
    title: "Quick Trivia Battle",
    category: "Party & knowledge",
    description:
      "Six questions. Two curious minds. Answer in turn and compare your score.",
    availability: "playable",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "chess",
    title: "Chess",
    category: "Board & strategy",
    description:
      "A planned implementation of the classic strategic board game.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "checkers",
    title: "Checkers",
    category: "Board & strategy",
    description: "A planned game of diagonal moves, jumps, and kings.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "reversi",
    title: "Reversi",
    category: "Board & strategy",
    description: "A planned disc-flipping contest for control of the board.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "crazy-eights",
    title: "Crazy Eights",
    category: "Cards & party",
    description:
      "A planned original card game implementation using classic matching rules.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "memory-match",
    title: "Memory Match",
    category: "Cards & party",
    description: "A planned matching game of memory and observation.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "word-duel",
    title: "Word Duel",
    category: "Cards & party",
    description: "A planned friendly contest for word lovers.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "draw-and-guess",
    title: "Draw & Guess",
    category: "Cards & party",
    description: "A planned party game of original drawings and guesses.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 8,
  },
  {
    id: "reaction-race",
    title: "Reaction Race",
    category: "Arcade & action",
    description: "A planned challenge of timing and reactions.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "tap-battle",
    title: "Tap Battle",
    category: "Arcade & action",
    description: "A planned short arcade contest with simple touch controls.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "mini-kart-race",
    title: "Mini Kart Race",
    category: "Arcade & action",
    description: "A planned original racing game on compact tracks.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "arena-dodge",
    title: "Arena Dodge",
    category: "Arcade & action",
    description: "A planned movement game of dodging obstacles.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "target-challenge",
    title: "Target Challenge",
    category: "Arcade & action",
    description: "A planned target-tapping accuracy contest.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "sudoku-sprint",
    title: "Sudoku Sprint",
    category: "Puzzles & family",
    description: "A planned number puzzle challenge.",
    availability: "planned",
    minPlayers: 1,
    maxPlayers: 2,
  },
  {
    id: "word-search-race",
    title: "Word Search Race",
    category: "Puzzles & family",
    description: "A planned race to find words in a letter grid.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    id: "sliding-puzzle",
    title: "Sliding Puzzle",
    category: "Puzzles & family",
    description: "A planned tile puzzle with friendly competition.",
    availability: "planned",
    minPlayers: 1,
    maxPlayers: 2,
  },
  {
    id: "number-duel",
    title: "Number Duel",
    category: "Puzzles & family",
    description: "A planned arithmetic challenge for two players.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "emoji-guess",
    title: "Emoji Guess",
    category: "Puzzles & family",
    description: "A planned party puzzle using original symbol clues.",
    availability: "planned",
    minPlayers: 2,
    maxPlayers: 8,
  },
];

export const catalog: readonly GameMetadata[] = entries.map((entry) => ({
  ...entry,
  ageRating: "Unrated; private adult beta only",
  version: entry.availability === "playable" ? "0.1.0" : "0.0.0",
  thumbnail: "/icon.svg",
  developer: "PlayNex",
  license:
    entry.availability === "playable"
      ? "Original PlayNex implementation; repository license applies"
      : "Not implemented",
  multiplayer: entry.availability === "playable",
  monetization: "free",
  languages: ["en"],
  devices: ["android-web", "ios-web", "desktop-web"],
}));
const byId = new Map(catalog.map((game) => [game.id, game]));
/** Indexed ID lookup remains constant-time as the catalog grows. */
export function getGameMetadata(id: string): GameMetadata | undefined {
  return byId.get(id);
}
/** Small-catalog search; replace with paginated database full-text search at scale. */
export function searchCatalog(
  query: string,
  availability?: GameMetadata["availability"],
): readonly GameMetadata[] {
  const normalized = query.trim().toLocaleLowerCase("en");
  return catalog.filter(
    (game) =>
      (!availability || game.availability === availability) &&
      `${game.title} ${game.description} ${game.category}`
        .toLocaleLowerCase("en")
        .includes(normalized),
  );
}
