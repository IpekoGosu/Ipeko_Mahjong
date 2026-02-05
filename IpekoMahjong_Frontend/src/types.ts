// Tile string format: "{number}{suit}"
// Suits: 'm' (man), 'p' (pin), 's' (sou), 'z' (zihai - 1:East, 2:South, 3:West, 4:North, 5:White, 6:Green, 7:Red)
export type TileString = string // e.g., "1m", "5z"

export interface PlayerInfo {
    id: string
    isAi: boolean
    jikaze?: string
}

// Event: 'game-started'
export interface GameStartedPayload {
    roomId: string
    yourPlayerId: string
    oyaId: string
    players: PlayerInfo[]
    hand: TileString[] // Your starting hand (13 tiles)
    dora: TileString[] // Initial dora indicators
    actualDora?: TileString[]
    wallCount: number
    deadWallCount: number
    riichiDiscards?: TileString[]
    waits?: TileString[]
}

// Event: 'round-started'
export interface RoundStartedPayload {
    hand: TileString[]
    dora: TileString[]
    actualDora?: TileString[]
    wallCount: number
    bakaze: string
    kyoku: number
    honba: number
    kyotaku: number
    oyaId: string
    scores: { id: string; points: number; jikaze?: string }[]
    waits?: TileString[]
}

// Event: 'round-ended'
export interface RoundEndedPayload {
    reason: 'ron' | 'tsumo' | 'ryuukyoku'
    scores: { id: string; points: number }[]
    scoreDeltas?: Record<string, number>
    winScore?: {
        han: number
        fu: number
        ten: number
        yakuman: number
        yaku: Record<string, string>
        oya: number[]
        ko: number[]
        name: string
        text: string
    }
    winnerId?: string
    loserId?: string
    nextState: {
        bakaze: string
        kyoku: number
        honba: number
        isGameOver: boolean
    }
}

// Event: 'turn-changed'
export interface TurnChangedPayload {
    playerId: string // The ID of the player whose turn it is
    wallCount: number
    deadWallCount: number
    dora?: TileString[] // Updated dora indicators (e.g. after Kan)
    actualDora?: TileString[]
    isFuriten?: boolean
}

// Event: 'riichi-declared'
export interface RiichiDeclaredPayload {
    playerId: string
}

// Event: 'new-tile-drawn' (Only received if it's YOUR turn)
export interface NewTileDrawnPayload {
    tile: TileString
    riichiDiscards?: TileString[]
    canTsumo?: boolean
    isFuriten?: boolean
    waits?: TileString[]
    ankanList?: TileString[]
    kakanList?: TileString[]
    dora?: TileString[]
    actualDora?: TileString[]
}

// Event: 'update-discard'
export interface UpdateDiscardPayload {
    playerId: string
    tile: TileString
    isFuriten?: boolean
    waits?: TileString[]
}

// Event: 'ask-action'
export interface AskActionPayload {
    tile: TileString // The tile being discarded by others
    chi?: boolean
    pon?: boolean
    kan?: boolean
    ron?: boolean
    chiOptions?: TileString[][] // e.g. [['3m', '4m'], ['4m', '6m']]
}

// Event: 'update-meld'
export interface UpdateMeldPayload {
    playerId: string
    type: 'chi' | 'pon' | 'kan' | 'ron'
    tiles: TileString[] // The tiles involved in the meld (e.g., ['1m', '2m', '3m'])
    stolenFrom?: string // Player ID whose discard was taken
    isFuriten?: boolean
    waits?: TileString[]
}

// Event: 'game-over'
export interface GameOverPayload {
    reason: 'tsumo' | 'ron' | 'ryuukyoku' | 'player-disconnected'
    winnerId?: string // Present if reason is 'tsumo' or 'ron'
    disconnectedPlayerId?: string // Present if reason is 'player-disconnected'
    score?: {
        han: number
        fu: number
        ten: number
        yakuman: number
        yaku: Record<string, string>
        oya: number[]
        ko: number[]
        name: string
        text: string
    }
    scores?: number[] // Final scores
}

// Event: 'error'
export interface ErrorPayload {
    message: string
}

export interface PlayerState {
    id: string
    isAi: boolean
    handCount: number // For opponents (starts at 13)
    discards: string[] // List of discarded tiles
    melds: { tiles: string[]; stolenFrom?: string }[] // List of melds with metadata
    isMyTurn: boolean
    isRiichi?: boolean
    isFuriten?: boolean
    points: number
    jikaze?: string
}

export interface GameState {
    isConnected: boolean
    roomId: string | null
    myPlayerId: string | null
    myHand: string[] // List of tile strings.
    drawnTile: string | null // The 14th tile.
    dora: string[]
    actualDora: string[]
    players: PlayerState[]
    wallCount: number
    deadWallCount: number
    dealerId: string | null
    actionRequest: AskActionPayload | null
    gameOverData: GameOverPayload | null
    roundEndedData: RoundEndedPayload | null
    riichiDiscards: string[]
    canTsumo: boolean
    waits: string[]
    ankanList: string[]
    kakanList: string[]
    logs: string[]
    // Hanchan State
    bakaze: string
    kyoku: number
    honba: number
    kyotaku: number
}

