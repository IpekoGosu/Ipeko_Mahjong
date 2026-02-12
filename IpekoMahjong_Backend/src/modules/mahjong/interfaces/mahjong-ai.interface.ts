import { MeldType } from '../interfaces/mahjong.types'

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
