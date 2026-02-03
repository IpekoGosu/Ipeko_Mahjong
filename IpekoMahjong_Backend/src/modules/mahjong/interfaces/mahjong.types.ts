import { Tile } from '../classes/tile.class'

export type Suit = 'm' | 'p' | 's' | 'z'

export type MeldType = 'chi' | 'pon' | 'kan' | 'chakan'

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
