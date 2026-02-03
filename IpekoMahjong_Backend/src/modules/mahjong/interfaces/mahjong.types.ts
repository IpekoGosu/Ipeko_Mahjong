export type Suit = 'm' | 'p' | 's' | 'z'

export interface Tile {
    id: string // e.g., "m_1_0", "z_5_2"
    suit: Suit
    rank: number // 1-9 for m, p, s; 1-7 for z (1=E, 2=S, 3=W, 4=N, 5=White, 6=Green, 7=Red)
    isRed: boolean
    toString(): string // For riichi library, e.g., "1m", "5p"
}

export type MeldType = 'chi' | 'pon' | 'kan' | 'chakan'

export interface Meld {
    type: MeldType
    tiles: Tile[]
    opened: boolean // true if not a closed kan
}

export interface ScoreCalculation {
    oya: Array<number>
    ko: Array<number>
}
