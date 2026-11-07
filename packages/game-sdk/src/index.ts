/** Rules execute on the trusted server. Clients receive only a public projection. */
export type PlayerIndex = 0 | 1;
export type Winner = PlayerIndex | "draw" | null;
export type GameId = "tic-tac-toe" | "four-in-a-row" | "quick-trivia";
export interface GameDefinition<State, View> {
  initialState(): State;
  applyMove(state: State, player: PlayerIndex, move: unknown): State;
  publicState(state: State, player: PlayerIndex): View;
}
export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  minPlayers: number;
  maxPlayers: number;
  ageRating: string;
  version: string;
  thumbnail: string;
  developer: string;
  license: string;
  multiplayer: boolean;
  monetization: "free" | "premium";
  availability: "playable" | "planned";
  languages: string[];
  devices: string[];
}

export { catalog, getGameMetadata, searchCatalog } from "./catalog";
