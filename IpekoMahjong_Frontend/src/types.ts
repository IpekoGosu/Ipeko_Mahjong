// Tile string format: "{number}{suit}"
// Suits: 'm' (man), 'p' (pin), 's' (sou), 'z' (zihai - 1:East, 2:South, 3:West, 4:North, 5:White, 6:Green, 7:Red)
export type TileString = string; // e.g., "1m", "5z"

export interface PlayerInfo {
  id: string;
  isAi: boolean;
}

// Event: 'game-started'
export interface GameStartedPayload {
  roomId: string;
  yourPlayerId: string;
  players: PlayerInfo[];
  hand: TileString[]; // Your starting hand (13 tiles)
  dora: TileString[]; // Initial dora indicators
  wallCount: number;
  deadWallCount: number;
  riichiDiscards?: TileString[];
}

// Event: 'turn-changed'
export interface TurnChangedPayload {
  playerId: string; // The ID of the player whose turn it is
  wallCount: number;
  deadWallCount: number;
  dora?: TileString[]; // Updated dora indicators (e.g. after Kan)
}

// Event: 'riichi-declared'
export interface RiichiDeclaredPayload {
  playerId: string;
}

// Event: 'new-tile-drawn' (Only received if it's YOUR turn)
export interface NewTileDrawnPayload {
  tile: TileString;
  riichiDiscards?: TileString[];
  canTsumo?: boolean;
}

// Event: 'update-discard'
export interface UpdateDiscardPayload {
  playerId: string;
  tile: TileString;
}

// Event: 'ask-action'
export interface AskActionPayload {
  tile: TileString; // The tile being discarded by others
  chi?: boolean;
  pon?: boolean;
  kan?: boolean;
  ron?: boolean;
  chiOptions?: TileString[][]; // e.g. [['3m', '4m'], ['4m', '6m']]
}

// Event: 'update-meld'
export interface UpdateMeldPayload {
  playerId: string;
  type: "chi" | "pon" | "kan" | "ron";
  tiles: TileString[]; // The tiles involved in the meld (e.g., ['1m', '2m', '3m'])
  stolenFrom?: string; // Player ID whose discard was taken
}

// Event: 'game-over'
export interface GameOverPayload {
  reason: "tsumo" | "ron" | "ryuukyoku" | "player-disconnected";
  winnerId?: string; // Present if reason is 'tsumo' or 'ron'
  disconnectedPlayerId?: string; // Present if reason is 'player-disconnected'
  score?: {
    han: number;
    fu: number;
    ten: number;
    yakuman: number;
    yaku: Record<string, string>;
    oya: number[];
    ko: number[];
    name: string;
    text: string;
  };
}

// Event: 'error'
export interface ErrorPayload {
  message: string;
}

export interface PlayerState {
  id: string;
  isAi: boolean;
  handCount: number; // For opponents (starts at 13)
  discards: string[]; // List of discarded tiles
  melds: { tiles: string[], stolenFrom?: string }[]; // List of melds with metadata
  isMyTurn: boolean;
  isRiichi?: boolean;
}

export interface GameState {
  isConnected: boolean;
  roomId: string | null;
  myPlayerId: string | null;
  myHand: string[]; // List of tile strings.
  drawnTile: string | null; // The 14th tile.
  dora: string[];
  players: PlayerState[];
  wallCount: number;
  deadWallCount: number;
  dealerId: string | null;
  actionRequest: AskActionPayload | null;
  gameOverData: GameOverPayload | null;
  riichiDiscards: string[];
  canTsumo: boolean;
  logs: string[];
}
