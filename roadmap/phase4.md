# Phase 4: Frontend Implementation (React + Visualization)

## 1. Overview
Building upon the prototype (which validated the WebSocket events), this phase delivers the polished user interface. It focuses on animations, responsive design, and providing a "real" Mahjong table experience.

## 2. Technical Stack
- **Framework**: React 18+ (Vite)
- **State Management**: Zustand (Clean, minimal boilerplate for game state).
- **Styling**: Tailwind CSS + Framer Motion (for tile animations).
- **Assets**: SVG Mahjong Tiles (Vector graphics for scalability).

## 3. Architecture & Store Design

### 3.1. Zustand Store (`useGameStore`)
The store mirrors the backend `GameState` but adds UI-specific flags.

```typescript
interface GameStore {
  // Connection
  socket: Socket | null;
  isConnected: boolean;

  // Data
  roomId: string | null;
  players: Record<string, ClientPlayerState>; // Mapped by ID
  myHand: string[];
  lastDiscard: { tile: string, playerId: string } | null;

  // UI State
  focusedTileIndex: number | null; // For keyboard navigation
  isAnimationPlaying: boolean;
  modal: 'none' | 'result' | 'settings';

  // Actions
  connect: (url: string) => void;
  discard: (tile: string) => void;
  declare: (type: ActionType) => void;
}
```

### 3.2. Component Hierarchy

```
App
├── Lobby (Room selection / Name entry)
└── GameTable
    ├── TableCenter (Info, remaining tiles, Dora)
    ├── OpponentHand (Top, Left, Right)
    │   ├── HiddenTiles (Back of card)
    │   ├── DiscardPile
    │   └── Melds (Exposed tiles)
    └── PlayerHand (Bottom)
        ├── HandTiles (Interactive, Draggable)
        ├── ActionMenu (Chi/Pon/Kan/Riichi buttons - Floating)
        └── DiscardPile
```

## 4. Key Features to Implement

### 4.1. Tile Rendering & Interaction
- **SVG Components**: Create `<Tile suit="m" rank={1} />` components.
- **Sorting**: Allow users to toggle "Auto-sort" (by Suit/Rank) or manual drag-and-drop.
- **Selection**: Click to select (lift up), click again to discard.

### 4.2. Animations (Framer Motion)
- **Discard**: Smooth transition from Hand position to Discard Pile.
- **Draw**: Tile appears from the Wall position to Hand.
- **Calls**: "PON!" text flash overlay.

### 4.3. Sound Manager
- **Context**: `SoundContext` to play SFX without re-rendering.
- **Assets**:
  - `click.mp3`: Tile selection.
  - `discard.mp3`: Tile hitting the table.
  - `voice_pon.mp3`, `voice_ron.mp3`: Voice cues.

## 5. Deliverables for Phase 4
1. **Responsive Table**: Looks good on Desktop (Landscape) and Tablet.
2. **Visual Feedback**: Clear indication of whose turn it is.
3. **Game End Screen**: Table summary showing all hands, hidden dora, and score changes.
