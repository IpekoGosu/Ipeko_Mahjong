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
}

// Event: 'game-over'
export interface GameOverPayload {
  reason: "tsumo" | "ryuukyoku" | "player-disconnected";
  winnerId?: string; // Present if reason is 'tsumo'
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
  melds: string[][]; // List of melds (e.g. [['1m', '2m', '3m']])
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
  logs: string[];
}
