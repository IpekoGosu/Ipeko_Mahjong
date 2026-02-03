# Phase 3: Advanced AI & Model Integration

## 1. Overview
The goal of this phase is to replace the "Dummy AI" with a competent Mahjong engine. We will support two tiers of AI: a fast, rule-based efficiency engine (for standard play) and a Deep Learning model integration (for "God mode" or analysis).

## 2. AI Architecture

### 2.1. Abstract Interface
**File**: `src/modules/mahjong/interfaces/ai-strategy.interface.ts`

```typescript
export interface AIStrategy {
  // Main turn decision
  decideDiscard(hand: Tile[], discards: Tile[][], dora: Tile[]): Promise<string>; // returns tile ID

  // Reaction decision
  decideCall(hand: Tile[], discard: Tile, options: CallOption[]): Promise<CallAction | 'pass'>;
}
```

### 2.2. Tier 1: Probabilistic Efficiency (The "Fast" AI)
**Implementation**: `src/modules/mahjong/ai/strategies/efficiency.strategy.ts`

- **Algorithm**:
  - Use `riichi` or `shanten` libraries to calculate "Ukeire" (tile acceptance).
  - **Discard Logic**: Discard the tile that maximizes the number of tiles that improve the hand (Shanten reduction).
  - **Call Logic**: Only call if it drastically improves Shanten or value (e.g., Dora > 2).

### 2.3. Tier 2: Deep Learning Integration (The "Pro" AI)
**Implementation**: `src/modules/mahjong/ai/strategies/model.strategy.ts`

- **Approach**: Suphx-like architecture or Supervised Learning on Tenhou logs.
- **Integration**:
  - Since Node.js isn't ideal for running heavy PyTorch/TF models, we will use an **external microservice** or **ONNX Runtime**.
- **External Service**:
  - **Language**: Python (FastAPI).
  - **Input**: 34x4x1 data tensor (representing the board).
  - **Output**: Probability distribution over 34 tiles (discard) or boolean actions (calls).

## 3. Difficulty Levels
**File**: `src/modules/mahjong/ai/ai.factory.ts`

- **Beginner**: Purely random discard (from Phase 2 Dummy).
- **Intermediate**: Efficiency Strategy (maximizes speed to Tenpai).
- **Advanced**: Efficiency + Defense (Betaori). If an opponent calls Riichi, discard only safe tiles (Genbutsu).
- **Expert**: Model Strategy (Predicts opponent hands).

## 4. Deliverables for Phase 3
1. **AI Microservice (Optional)**: A simple Python script serving a pre-trained model (e.g., `Mortal` or `AkoChan` port).
2. **Defensive Logic**: The AI should stop attacking if a player declares Riichi.
3. **Benchmarking**: run 100 AI vs AI games and record win rates.
