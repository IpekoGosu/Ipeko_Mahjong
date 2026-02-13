# Frontend Prototype Specification (Phase 2 & 4 Refined)

## 1. Project Overview

**Goal**: Create a lightweight frontend application to verify the Mahjong Game logic implemented in the `IpekoMahjong_Backend` (Phase 2 & 3).
**Primary User**: Developer (for testing purposes).
**Key Feature**: Authenticate via JWT, connect to WebSocket, play a full game loop (Draw -> Discard -> Call -> Riichi -> Win), support Hanchan state (multiple rounds), and view detailed game state updates.

## 2. Technical Stack

- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`
- **Communication**: `socket.io-client`
- **Authentication**: Cookie-based JWT (with `withCredentials: true`)
- **Assets**: Simple CSS boxes with text/emoji modes for tiles.

## 3. Architecture & State

### 3.1 Connection Details

- **URL**: `http://localhost:3000` (Backend API & WebSocket)
- **Namespace**: `/` (Default)
- **Auth**: Requires valid `access_token` in cookies or passed via auth payload.

### 3.2 Types & Interfaces (Refined Contract)

The frontend uses these interfaces to match the backend events exactly.

```typescript
// Tile string format: "{number}{suit}"
// Suits: 'm' (man), 'p' (pin), 's' (sou), 'z' (zihai - 1..7)
export type TileString = string; // e.g., "1m", "5z", "0s" (Aka Dora)

export interface PlayerInfo {
  id: string;
  isAi: boolean;
  jikaze?: string; // e.g., "1z" (East)
}

// Event: 'game-started' (Sent once when room is created)
export interface GameStartedPayload {
  roomId: string;
  yourPlayerId: string;
  oyaId: string;
  players: PlayerInfo[];
  hand: TileString[];
  dora: TileString[];
  actualDora?: TileString[];
  wallCount: number;
  deadWallCount: number;
  riichiDiscards?: TileString[];
  waits?: TileString[];
}

// Event: 'round-started' (Sent at the start of every Kyoku)
export interface RoundStartedPayload {
  hand: TileString[];
  dora: TileString[];
  actualDora?: TileString[];
  wallCount: number;
  bakaze: string; // "1z", "2z"
  kyoku: number; // 1-4
  honba: number;
  kyotaku: number;
  oyaId: string;
  scores: { id: string; points: number; jikaze?: string }[];
  waits?: TileString[];
}

// Event: 'round-ended'
export interface RoundEndedPayload {
  reason: 'ron' | 'tsumo' | 'ryuukyoku';
  scores: { id: string; points: number }[];
  scoreDeltas?: Record<string, number>;
  winScore?: WinScoreDetails;
  winnerId?: string;
  loserId?: string;
  nextState: {
    bakaze: string;
    kyoku: number;
    honba: number;
    isGameOver: boolean;
  };
}

// Event: 'turn-changed'
export interface TurnChangedPayload {
  playerId: string;
  wallCount: number;
  deadWallCount: number;
  dora?: TileString[];
  actualDora?: TileString[];
  isFuriten?: boolean;
}

// Event: 'riichi-declared'
export interface RiichiDeclaredPayload {
  playerId: string;
  score?: number;
  kyotaku?: number;
}

// Event: 'new-tile-drawn' (Only for the active player)
export interface NewTileDrawnPayload {
  tile: TileString;
  riichiDiscards?: TileString[];
  canTsumo?: boolean;
  isFuriten?: boolean;
  waits?: TileString[];
  ankanList?: TileString[];
  kakanList?: TileString[];
  dora?: TileString[];
  actualDora?: TileString[];
}

// Event: 'update-discard'
export interface UpdateDiscardPayload {
  playerId: string;
  tile: TileString;
  isFuriten?: boolean;
  waits?: TileString[];
}

// Event: 'ask-action' (Ron/Pon/Chi/Kan options)
export interface AskActionPayload {
  tile: TileString;
  chi?: boolean;
  pon?: boolean;
  kan?: boolean;
  ron?: boolean;
  chiOptions?: TileString[][];
}

// Event: 'update-meld'
export interface UpdateMeldPayload {
  playerId: string;
  type: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan';
  tiles: TileString[];
  stolenFrom?: string;
  isFuriten?: boolean;
  waits?: TileString[];
}

// Event: 'game-over'
export interface GameOverPayload {
  reason: 'tsumo' | 'ron' | 'ryuukyoku' | 'player-disconnected';
  winnerId?: string;
  score?: WinScoreDetails;
  finalRanking?: RankingEntry[];
}
```

### 3.3 Global State (Zustand/React State)

```typescript
export interface PlayerState {
  id: string;
  isAi: boolean;
  handCount: number;
  discards: string[];
  melds: { tiles: string[]; stolenFrom?: string }[];
  isMyTurn: boolean;
  isRiichi?: boolean;
  riichiIndex?: number;
  isFuriten?: boolean;
  points: number;
  jikaze?: string;
}

export interface GameState {
  isConnected: boolean;
  roomId: string | null;
  myPlayerId: string | null;
  myHand: string[];
  drawnTile: string | null;
  dora: string[];
  actualDora: string[];
  players: PlayerState[];
  wallCount: number;
  deadWallCount: number;
  dealerId: string | null;
  actionRequest: AskActionPayload | null;
  roundEndedData: RoundEndedPayload | null;
  gameOverData: GameOverPayload | null;
  riichiDiscards: string[];
  canTsumo: boolean;
  waits: string[];
  ankanList: string[];
  kakanList: string[];
  // Hanchan State
  bakaze: string;
  kyoku: number;
  honba: number;
  kyotaku: number;
}
```

## 4. UI Layout (Refined)

The UI is a 2D Mahjong Table representation:
- **Center Box**: Displays Bakaze (Wind), Kyoku (Round), Honba, Kyotaku, and player scores/winds.
- **Ponds (Kawa)**: Discards arranged in 6x3 grids for each player, with Riichi tiles rotated.
- **Hand Area**: Current player's tiles, including the "Drawn Tile" separated from the hand.
- **Info Panels**: Dora indicators, remaining wall count, and "Wait" tiles display.
- **Modals**: Detailed "Round Ended" summary (Han, Fu, Yaku breakdown) and "Game Over" final rankings.

## 5. Functional Logic & Event Handling

### 5.1 Initialization & Auth
- User logs in via `Login` component -> Backend sets JWT in HttpOnly cookie.
- Frontend fetches `/user/me` to verify session.
- Connects to Socket.IO with `withCredentials: true`.

### 5.2 Core Actions
- **Discard**: User clicks a tile in hand -> emits `discard-tile` with `{ roomId, tile, isRiichi }`.
- **Riichi**: User clicks "Riichi" button -> enters Riichi intent mode -> highlights valid discard tiles -> emits `discard-tile` with `isRiichi: true`.
- **Calling**: On `ask-action`, buttons appear.
  - **Pon/Kan/Ron**: Emits `select-action` with type and tile.
  - **Chi**: Displays sub-options for sequence selection.
  - **Skip**: Emits `select-action` with `{ type: 'skip' }`.
- **Self-Actions**: `Ankan`, `Kakan`, and `Tsumo` buttons appear on `new-tile-drawn` if eligible.

### 5.3 AI Interaction
- Backend handles AI decisions with configurable delays.
- Frontend visually reflects AI discards and turns by updating `handCount` and `discards` array.

## 6. Implementation Milestones

1. **Authentication Layer**: Completed (JWT + Cookies).
2. **Game Core Loop**: Completed (Start -> Play -> Round End -> Next Round).
3. **Advanced Rules**: Completed (Riichi, Furiten, Ankan/Kakan, Dora reveal timing).
4. **Scoring Display**: Completed (detailed Yaku and point delta breakdown).
5. **Sanma Support**: Infrastructure present in BE, FE adaptable to 3-player layout.
