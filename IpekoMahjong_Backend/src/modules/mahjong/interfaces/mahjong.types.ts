import { Tile } from '../classes/tile.class'

export type Suit = 'm' | 'p' | 's' | 'z'

export type MeldType = 'chi' | 'pon' | 'kan' | 'chakan' | 'ankan' | 'kakan'

export interface Meld {
    type: MeldType
    tiles: Tile[]
    opened: boolean // true if not a closed kan
}

export interface ScoreCalculation {
    han: number
    fu: number
    ten: number
    yaku: Record<string, string>
    yakuman: number
    oya: number[]
    ko: number[]
    name: string
    text: string
}

export interface PossibleActions {
    chi?: boolean
    pon?: boolean
    kan?: boolean
    ron?: boolean
    chiOptions?: string[][]
}

export interface RiichiResult {
    isAgari: boolean
    yakuman: number
    yaku: Record<string, string>
    han: number
    fu: number
    ten: number
    name: string
    text: string
    oya: number[]
    ko: number[]
    error: boolean
    hairi?: { now: number; wait: Record<string, number> }
    hairi7and13?: { now: number; wait: Record<string, number> }
    wait?: string
}

export interface GameUpdate {
    roomId: string
    isGameOver: boolean
    reason?: 'tsumo' | 'ryuukyoku' | 'player-disconnected' | 'ron'
    events: {
        eventName: string
        payload: Record<string, unknown>
        to: 'all' | 'player'
        playerId?: string
    }[]
}
