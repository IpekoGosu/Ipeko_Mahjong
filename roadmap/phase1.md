# Phase 1: Core Game Engine & Basic Logic (Foundation) Specification

## 1. Overview
This phase focuses on building the immutable core of the Mahjong game: the physical objects (Tiles, Wall), the actors (Player), and the turn-based state machine. The goal is to have a runnable console-based or test-driven game loop that can shuffle, deal, and cycle through turns.

## 2. Technical Requirements
- **Framework**: NestJS (Module: `MahjongModule`)
- **Language**: TypeScript (Strict Mode)
- **External Libraries**: `riichi` (for static tile definitions and eventual scoring)
- **Testing**: Jest (Unit Tests for classes, Integration Tests for Game Service)

## 3. Detailed File Structure & Implementation

### 3.1. Shared Interfaces & Constants
**File**: `src/modules/mahjong/interfaces/mahjong.types.ts`

```typescript
export type Suit = 'm' | 'p' | 's' | 'z'; // Man, Pin, Sou, Zihai
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// The atomic representation of a tile
export interface Tile {
  id: string;       // Unique ID (e.g., "m1_0", "z5_2")
  suit: Suit;
  rank: Rank;
  isRed: boolean;   // Akadora
  isDoraIndicator: boolean;
  toShortString(): string; // e.g., "1m", "5z", "0p" (red 5pin)
}

// Game Phases for the State Machine
export enum GamePhase {
  WAITING_START = 'WAITING_START',
  DEALING = 'DEALING',
  PLAYER_TURN = 'PLAYER_TURN', // Waiting for discard or tsumo
  PROCESSING_ACTION = 'PROCESSING_ACTION', // Waiting for Chi/Pon/Kan/Ron
  GAME_OVER = 'GAME_OVER',
}

export interface PlayerState {
  id: string;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[]; // Define Meld interface later in Phase 2, empty for now
  score: number;
  isRiichi: boolean;
  wind: 'east' | 'south' | 'west' | 'north';
}
```

### 3.2. Tile Class
**File**: `src/modules/mahjong/classes/tile.class.ts`

- **Constructor**: `(suit: Suit, rank: Rank, index: number, isRed: boolean)`
- **Properties**: `readonly id`, `suit`, `rank`, `isRed`.
- **Methods**:
  - `toString()`: Returns human-readable string.
  - `toShortString()`: Returns `riichi` library compatible string (e.g. `0m` for red 5 man).
  - static `fromString(str: string)`: Factory method for testing.

### 3.3. Wall Class (The Deck)
**File**: `src/modules/mahjong/classes/wall.class.ts`

- **Responsibilities**: Manage the 136 tiles, Dead Wall (Wanpai), and Dora indicators.
- **Properties**:
  - `tiles: Tile[]` (Main draw stack)
  - `deadWall: Tile[]` (14 tiles reserved)
  - `doraIndicators: Tile[]`
  - `uraDoraIndicators: Tile[]`
- **Methods**:
  - `initialize()`: Create 136 tiles.
    - 4 copies of each Suit/Rank.
    - Handle Red Fives: 1 red out of 4 for 5m, 5p, 5s (Standard rule).
  - `shuffle()`: Implement **Fisher-Yates** algorithm.
  - `constructDeadWall()`: Move last 14 tiles to `deadWall`. Reveal 1st dora indicator.
  - `draw()`: Pop and return 1 tile from `tiles`. Throw error if empty (Ryuukyoku condition).
  - `getRemainingCount()`: Return `tiles.length`.

### 3.4. Player Class
**File**: `src/modules/mahjong/classes/player.class.ts`

- **Responsibilities**: Manage individual hand state.
- **Properties**:
  - `id: string`
  - `hand: Tile[]`
  - `discards: Tile[]`
  - `wind: Wind`
- **Methods**:
  - `draw(tile: Tile)`: Add to `hand`. Sort hand helper (by suit/rank).
  - `discard(tileId: string)`: Remove from `hand`, add to `discards`, return the `Tile` object.
  - `getHandShanten()`: (Placeholder for Phase 2) Return infinity for now.

### 3.5. Game Room Service (The Engine)
**File**: `src/modules/mahjong/service/game-room.service.ts`

*Note: This service manages ONE game instance. For multiple games, a Manager service will spawn these.*

- **Properties**:
  - `roomId: string`
  - `wall: Wall`
  - `players: Player[]` (Fixed size 4)
  - `currentTurnIndex: number` (0-3)
  - `phase: GamePhase`
  - `activeTile: Tile | null` (The last discarded tile, for call checks)
- **Methods**:
  - `startGame()`:
    1. Call `wall.initialize()` & `wall.shuffle()`.
    2. Deal 13 tiles to each player (Chombo logic: dealing order is standard 4-4-4-1).
    3. Set `currentTurnIndex = 0` (Dealer/East).
    4. Transition to `PLAYER_TURN`.
  - `drawPhase()`:
    1. Check `wall.getRemainingCount()`. If 0, trigger `processRyuukyoku()`.
    2. `player = players[currentTurnIndex]`.
    3. `tile = wall.draw()`.
    4. `player.draw(tile)`.
    5. Return event payload (WHO drew WHAT).
  - `discardPhase(playerId: string, tileId: string)`:
    1. Validate `playerId` == `currentTurnIndex`.
    2. `tile = player.discard(tileId)`.
    3. `activeTile = tile`.
    4. **(Phase 2 Hook)**: Check for Ron/Chi/Pon/Kan.
    5. If no calls, `nextTurn()`.
  - `nextTurn()`:
    1. `currentTurnIndex = (currentTurnIndex + 1) % 4`.
    2. Call `drawPhase()`.

## 4. Deliverables for Phase 1
1. **Unit Tests**:
   - `wall.spec.ts`: Verify 136 tiles, correct number of Red fives, Dead wall separation.
   - `player.spec.ts`: Verify draw/discard mechanics, hand sorting.
2. **Integration Test**:
   - `game-flow.spec.ts`: Simulate a full game where players just draw and immediately discard (Tsumogiri) until the wall is empty. Ensure no crashes and correct turn rotation.

## 5. Excluded from Phase 1 (Do NOT Implement yet)
- Complex Scoring (Yaku/Fu).
- Chi/Pon/Kan/Riichi declarations.
- WebSocket handling (This is Phase 2, focus on pure Logic classes first).