# IpekoMahjong

IpekoMahjong is a full-stack, real-time Riichi Mahjong game implementation designed for both single-player (vs AI) and future multi-player gameplay. The project is structured as a monorepo, combining a robust NestJS backend with a modern React frontend.

## 🚀 Project Overview

The goal of this project is to implement a complete Mahjong engine that adheres strictly to competitive rules (Tenhou/Mahjong Soul standards), providing a polished user experience and a highly maintainable codebase.

### Key Features
- **Sophisticated Mahjong Engine**: Full implementation of Riichi Mahjong rules, including complex Yaku calculation, Furiten logic, Abortive Draws, and Kan Dora mechanics.
- **Real-time Gameplay**: Low-latency communication powered by WebSockets (Socket.IO) for a seamless game loop.
- **AI Opponents**: Basic heuristic-based AI to provide a challenging single-player experience.
- **Robust Security**: JWT-based authentication with secure, cookie-based session management.
- **High Reliability**: A comprehensive test suite with 70+ test cases validating game rules, edge cases, and mechanics.

## 🛠 Tech Stack

### Backend (`IpekoMahjong_Backend`)
- **Framework**: [NestJS](https://nestjs.com/)
- **Communication**: Socket.IO (WebSockets)
- **Database**: [Prisma](https://www.prisma.io/) with MariaDB
- **Authentication**: Passport.js & JWT
- **Logic**: Custom-built Mahjong engine with `riichi` library integration for hand calculations.

### Frontend (`IpekoMahjong_Frontend`)
- **Framework**: [React](https://reactjs.org/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Hooks & Zustand-ready architecture
- **UI**: 2D Mahjong table representation with interactive action menus.

## 📁 Project Structure

```text
.
├── IpekoMahjong_Backend/   # NestJS source code and game logic
├── IpekoMahjong_Frontend/  # React/Vite source code and assets
├── roadmap/                # Project development phases and specifications
└── package.json            # Monorepo root configuration
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v22+)
- pnpm
- MariaDB

### Installation
```bash
pnpm install:all
```

### Running the Project
```bash
# Start both Backend and Frontend in development mode
pnpm dev

# Run Backend only
pnpm dev:backend

# Run Frontend only
pnpm dev:frontend
```

### Testing
```bash
# Run comprehensive backend test suite
pnpm test:backend
```

## 📜 Rules & Specifications
The game logic is validated against the [Tenhou Rule Specification](roadmap/tenhou-rules.txt). Detailed frontend requirements can be found in the [Frontend Prototype Specification](roadmap/frontend_prototype_spec.md).
