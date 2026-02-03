# Phase 5: Integration, Optimization & Deployment

## 1. Overview
The final phase ensures the game is production-ready. We move from "working logic" to "robust software" by adding comprehensive tests, monitoring, and deployment configurations.

## 2. Quality Assurance (Testing)

### 2.1. End-to-End (E2E) Testing
- **Tool**: Playwright or Cypress.
- **Scenarios**:
  1. **Happy Path**: P1 starts -> P1 wins -> Score screen.
  2. **Reconnection**: P1 disconnects in middle of game -> Reconnects -> State restored.
  3. **Concurrency**: 4 browsers connected to same room.

### 2.2. Stress Testing
- **Tool**: `artillery` or custom Node.js script.
- **Goal**: Simulate 100 simultaneous game rooms (400 sockets).
- **Metrics**: Monitor CPU/Memory usage of NestJS server.
- **Optimization**: Identify bottlenecks (e.g., extensive logging, unoptimized `riichi` calls).

## 3. DevOps & Deployment

### 3.1. Dockerization
**File**: `Dockerfile` (Multi-stage build)

- **Stage 1 (Build)**: Install deps, compile TypeScript (`npm run build`).
- **Stage 2 (Run)**: Alpine Node image, copy `dist/`.
- **Compose**: `docker-compose.yml` orchestrating:
  - `ipeko-backend`
  - `ipeko-frontend` (Nginx serving static files)
  - `redis` (For session store / matchmaking queue)

### 3.2. CI/CD Pipeline (GitHub Actions)
- **On Push/PR**:
  - Run `npm run lint`
  - Run `npm run test` (Unit)
  - Run `npm run test:e2e` (Headless)

## 4. Polishing
- **Spectator Mode**: Allow non-playing users to watch a room.
- **Replay System**: Save game logs (JSON) to database. Implement a "Replay Viewer" in frontend to step through a past game.
- **Localization**: Support English (`en`) and Korean (`ko`) text for Yaku names and UI.

## 5. Final Deliverables
- A fully dockerized repository.
- A live URL (e.g., on Vercel/Render) demonstrating the game.
- Documentation for API and WebSocket events.
