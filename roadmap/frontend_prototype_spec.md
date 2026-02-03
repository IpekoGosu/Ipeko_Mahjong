# Frontend Prototype Specification (Phase 2 & 4 Precursor)

## 1. Project Overview

**Goal**: Create a lightweight frontend application to verify the Single-Player Mahjong Game logic implemented in the `IpekoMahjong_Backend` (Phase 2).
**Primary User**: Developer (for testing purposes).
**Key Feature**: Connect to WebSocket, play a full game loop (Draw -> Discard -> Call -> Win), and view game state updates.

## 2. Technical Stack

- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (for rapid layout)
- **Communication**: `socket.io-client`
- **Assets**: Simple CSS boxes with text (e.g., "1m", "East") or Unicode characters.

## 3. Architecture & State

### 3.1 Connection Details

- **URL**: `http://localhost:3000` (or local env)
- **Namespace**: `/` (Default)

### 3.2 Types & Interfaces (Strict Contract)

The frontend must define these interfaces to match the backend events exactly (as defined in Phase 2).

```typescript
// Tile string format: "{number}{suit}"
// Suits: 'm' (man), 'p' (pin), 's' (sou), 'z' (zihai - 1..7)
export type TileString = string; // e.g., "1m", "5z"

export interface PlayerInfo {
  id: string;
  isAi: boolean;
  name?: string;
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
  timeLeft: number; // e.g., 10 seconds
  wallCount: number;
}

// Event: 'new-tile-drawn' (Only received if it's YOUR turn)
export interface NewTileDrawnPayload {
  tile: TileString;
}

// Event: 'update-discard'
export interface UpdateDiscardPayload {
  playerId: string;
  tile: TileString;
  isTsumogiri: boolean; // True if they discarded what they just drew
}

// Event: 'ask-action'
// Triggered when someone ELSE discards (or you draw a 4th tile for Kan)
export interface AskActionPayload {
  tile: TileString; // The tile being discarded
  canChi: boolean;
  canPon: boolean;
  canKan: boolean;
  canRon: boolean;
  chiOptions?: TileString[][]; // e.g. [['3m', '4m'], ['4m', '6m']] for a 5m discard
  timeLeft: number;
}

// Event: 'update-call'
// Broadcast when a player successfully executes a call
export interface UpdateCallPayload {
  playerId: string;
  type: "chi" | "pon" | "kan";
  tiles: TileString[]; // The tiles involved in the meld
  calledTile: TileString; // The tile taken from another player
}

// Event: 'game-over'
export interface GameOverPayload {
  reason: "tsumo" | "ron" | "ryuukyoku" | "abort";
  winners?: {
    id: string;
    score: number;
    yaku: string[]; // List of Yaku names
    fan: number;
    fu: number;
  }[];
  scores: Record<string, number>; // Final scores of all players
}

// Event: 'error'
export interface ErrorPayload {
  message: string;
  code?: string;
}
```

### 3.3 Global State (Store)

The application needs to track data derived from these events.

```typescript
interface PlayerState {
  id: string;
  isAi: boolean;
  handCount: number; // For opponents (starts at 13)
  discards: string[]; // List of discarded tiles
  melds: { type: string, tiles: string[] }[]; // Exposed melds
  score: number;
}

interface GameState {
  isConnected: boolean;
  roomId: string | null;
  myPlayerId: string | null;
  
  // My Data
  myHand: string[]; 
  drawnTile: string | null; // The 14th tile.
  
  // Game Data
  dora: string[];
  players: Record<string, PlayerState>; // Map playerId -> State
  activePlayerId: string | null;
  
  // Interaction
  actionRequest: AskActionPayload | null; // If not null, show call buttons
  logs: string[]; // Console logs for debugging
}
```

## 4. UI Layout (Wireframe)

```
+-------------------------------------------------------+
|                      [Top AI]                         |
|             (Hand: 13) | Discards: [1m, 2p...]        |
|             Melds: [ [1z,1z,1z] ]                     |
+-------------------------------------------------------+
| [Left AI]       |   [Center Info]    |     [Right AI] |
| (Hand: 13)      |   Dora: [1m]       |     (Hand: 13) |
| Discards: [...] |   Turn: Right AI   | Discards: [...]|
| Melds: []       |   Tiles Left: 60   | Melds: []      |
+-------------------------------------------------------+
|                     [My Player]                       |
|           Discards: [1s, 9p, ...]                     |
|           Melds: [ [2m,3m,4m] ]                       |
|                                                       |
|        [Hand Area - Click to Discard]                 |
|  [1m] [2m] [3m] ... + [Drawn Tile]                    |
|                                                       |
|   [ CALL BUTTONS: PON | CHI | RON ] (Visible only on 'ask-action') |
+-------------------------------------------------------+
| [Game Logs Console]                                   |
| > Game Started                                        |
| > Top AI discarded 5z                                 |
+-------------------------------------------------------+
```

## 5. Functional Logic & Event Handling

### 5.1 Initialization

- **Connect**: On mount, connect `socket.io-client`.
- **Start**: User clicks "Start Game" -> Emit `start-game`.

### 5.2 Event Handlers (Critical Logic)

1.  **`ask-action`**:
    - **UI**: Display buttons for `Pon`, `Chi`, `Kan`, `Ron` based on payload booleans.
    - **Timer**: Show a countdown (e.g., 5s).
    - **Interaction**:
      - If user clicks "Pass" or timeout -> Emit `declare-action` with `{ type: 'pass' }`.
      - If user clicks "Pon" -> Emit `declare-action` with `{ type: 'pon' }`.
      - If "Chi" -> Show sub-modal if multiple options exist, then emit.

2.  **`update-call`**:
    - Move tiles from `hand` (or `handCount`) to `melds` for the target player.
    - If it was ME, remove specific tiles from `myHand`.
    - **Visual**: The called tile should be rotated or marked to show who it came from.

3.  **`turn-changed`**:
    - If `activePlayer` is an OPPONENT, play "Draw" animation (increment `handCount`).
    - If `activePlayer` is ME, wait for `new-tile-drawn`.

4.  **`new-tile-drawn`**:
    - **Condition**: Only fires for ME.
    - Set `drawnTile` = `payload.tile`.
    - Enable "Discard" interaction (clicking tiles in hand).
    - Enable "Tsumo" / "Kan" (Closed) buttons if applicable.

### 5.3 Actions

- **Discard**: User clicks a tile.
  - Emit `discard-tile`, payload: `{ tile: tileString }`.
  - **Optimistic UI**: Do NOT remove tile immediately. Wait for `update-discard` or `turn-changed` confirmation to prevent sync bugs.

## 6. Implementation Steps

1.  **Setup**: `npm create vite@latest frontend -- --template react-ts`
2.  **Dependencies**: `npm install socket.io-client zustand clsx tailwind-merge`
3.  **Components**:
    - `MahjongTile.tsx`: Renders text/border.
    - `ActionButtons.tsx`: The overlay for Calls.
    - `GameBoard.tsx`: Main logic container.
4.  **Integration**:
    - Use a custom hook `useMahjongSocket` to bind events to the Zustand store.