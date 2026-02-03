# Phase 2: Rules, Scoring & Real-time Networking

## 1. Overview
This phase transforms the passive game loop from Phase 1 into a fully interactive Mahjong game. It introduces the complex interrupt-driven logic of Mahjong (Chi/Pon/Kan/Ron) and connects the engine to clients via WebSockets.

## 2. Technical Requirements
- **Library**: `riichi` (npm install riichi) for hand analysis.
- **Protocol**: Socket.IO (via `@nestjs/websockets`).

## 3. detailed Implementation Steps

### 3.1. Rule Manager (The Brain)
**File**: `src/modules/mahjong/classes/rule.manager.ts`

This class wraps the `riichi` library to provide stateless answers to game state queries.

- **Methods**:
  - `checkTsumo(hand: Tile[], winTile: Tile): ScoreResult | null`
    - Converts `hand` + `winTile` to string (e.g., "1m2m3m4m5m6m7m8m9m1p1p1p1z1z").
    - Returns Yaku list, Han, Fu, and Points if valid.
  - `checkRon(hand: Tile[], discardTile: Tile): ScoreResult | null`
  - `checkRiichi(hand: Tile[]): boolean`
    - Checks if the hand is Tenpai (shanten == 0).
  - `checkCalls(hand: Tile[], discardTile: Tile): CallOption[]`
    - Returns array of possible actions: `['pon', 'kan', 'chi']`.
    - *Note*: Chi is only allowed if `discardTile` comes from the player to the **left**.

### 3.2. Asynchronous Turn Management (The Interruption System)
Mahjong is unique because a discard can be "interrupted" by other players.

**Updates to**: `src/modules/mahjong/service/game-room.service.ts`

- **State Change**:
  - Introduce `pendingActions: Map<playerId, Action>` to track responses after a discard.
  - When Player A discards:
    1. Pause `nextTurn()`.
    2. Calculate valid actions for Players B, C, D (Ron/Pon/Kan). Player B (Right) also checks Chi.
    3. Send `ask-action` event to eligible players.
    4. **Timer/Wait Logic**: Wait for all eligible players to pass or declare.
  - **Priority Logic**: Ron > Pon/Kan > Chi.
    - If B wants Chi and C wants Pon -> C wins.
    - If C and D both want Ron -> Double Ron (allow both).

### 3.3. WebSocket Gateway & Events
**File**: `src/modules/mahjong/mahjong.gateway.ts`

- **Connection**:
  - `handleConnection`: Authenticate user (JWT), join `roomId` room.
- **Incoming Events (Client -> Server)**:
  - `discard-tile`: `{ tileId: string }`
  - `declare-action`: `{ type: 'chi'|'pon'|'kan'|'ron'|'riichi'|'pass', tiles?: string[] }`
  - `start-game`: Admin/Host only.
- **Outgoing Events (Server -> Client)**:
  - `game-sync`: Full state dump (reconnection).
  - `turn-start`: `{ playerId: string, timeLimit: number }`
  - `action-request`: `{ options: ['pon', 'ron'], timeLimit: number }`
  - `game-result`: Final scores.

### 3.4. AI Integration (Heuristic Version)
**File**: `src/modules/mahjong/classes/dummy-ai.class.ts`

For Phase 2, we need non-brain-dead opponents to test the flow.
- **Logic**:
  - `onTurn()`: Draw -> `riichi.checkTsumo()` ? Tsumo : Discard isolated tile.
  - `onDiscard(tile)`: `riichi.checkRon()` ? Ron : Pass.
  - *No complex defense or efficiency logic yet.*

## 4. Deliverables for Phase 2
1. **Functional Calls**: Players can Pon, Chi, and Kan.
2. **Win Validation**: Game detects Tsumo/Ron and calculates basic score (Mangan, etc.).
3. **Flow Test**: A full game can be played via WebSocket events (using Postman or simple script).

## 5. Excluded
- Deep Learning AI.
- Fancy UI (This is Phase 4).
- Edge case rules (Nagashi Mangan, Pavillion rules).