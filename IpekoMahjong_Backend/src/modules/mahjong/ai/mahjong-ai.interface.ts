import { MeldType, PossibleActions } from '../interfaces/mahjong.types'

/**
 * Information about a player from the AI's perspective.
 */
export interface AIPlayerObservation {
    id: string
    handCount: number
    discards: string[]
    melds: {
        type: MeldType
        tiles: string[]
        opened: boolean
    }[]
    isRiichi: boolean
    isFuriten: boolean
    isIppatsu: boolean
    wind: number // 1: East, 2: South, 3: West, 4: North
    points: number
}

/**
 * The complete state of the game visible to the AI.
 */
export interface GameObservation {
    myHand: string[]
    myLastDraw: string | null
    players: AIPlayerObservation[]
    myIndex: number
    doraIndicators: string[]
    wallCount: number
    deadWallCount: number
    bakaze: number // 1: East, 2: South, ...
    turnCounter: number
}

/**
 * Abstract AI interface for Mahjong.
 * This can be implemented by simple heuristic-based AIs or sophisticated neural networks.
 */
export interface MahjongAI {
    /**
     * Decides which tile to discard given the current game observation.
     */
    decideDiscard(observation: GameObservation): string

    /**
     * Decides whether to perform an action (Chi, Pon, Kan, Ron) on a discarded tile.
     * Returns the action type or 'skip'.
     */
    decideAction(
        observation: GameObservation,
        discardedTile: string,
        possibleActions: PossibleActions,
    ): 'chi' | 'pon' | 'kan' | 'ron' | 'skip'
}
