# Ipeko Mahjong Development Roadmap

## Project Overview
**Goal**: Build a Single-Player Riichi Mahjong game where 1 human plays against 3 AI opponents.
**Platform**: Web (NestJS Backend + React Frontend).

## Phase Structure

This project follows a 5-phase development lifecycle. Each phase has a detailed specification file in the `roadmap/` directory.

### [Phase 1: Core Engine & Foundation](./roadmap/phase1.md)
**Focus**: The immutable physics of Mahjong.
- **Key Features**: Tile class, Wall (Deck) generation, Shuffle, Deal, Basic Turn Loop.
- **Output**: A console/test-based loop where players draw and discard until the wall is empty.
- **Tech**: NestJS, TypeScript, Jest.

### [Phase 2: Rules, Scoring & Networking](./roadmap/phase2.md)
**Focus**: Making the game playable and networked.
- **Key Features**: WebSocket Integration, Call Parsing (Chi/Pon/Kan), Riichi, Win Detection (Ron/Tsumo), Scoring.
- **Output**: A playable game via WebSocket events (using Dummy AI).
- **Tech**: Socket.IO, `riichi` library.

### [Phase 3: AI Development](./roadmap/phase3.md)
**Focus**: Creating intelligent opponents.
- **Key Features**: AI Interface, Efficiency Strategy (Fast), Model-based Strategy (Smart).
- **Output**: Opponents that play realistically (defense, efficiency).
- **Tech**: Heuristics, Python (Optional for ML model).

### [Phase 4: Frontend Implementation](./roadmap/phase4.md)
**Focus**: The player experience.
- **Key Features**: React UI, Animations, Sound, Responsive Design.
- **Prototype Spec**: See [Frontend Prototype Spec](./roadmap/frontend_prototype_spec.md) for the initial connection test.
- **Output**: Polished web application.
- **Tech**: React, Zustand, Tailwind, Framer Motion.

### [Phase 5: Integration & Polish](./roadmap/phase5.md)
**Focus**: Production readiness.
- **Key Features**: E2E Testing, Docker Deployment, Spectator Mode, Replays.
- **Output**: Live public URL.
- **Tech**: Docker, Playwright, GitHub Actions.

---
*Last Updated: February 2026*