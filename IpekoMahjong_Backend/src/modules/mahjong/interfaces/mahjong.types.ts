import { Tile } from '@src/modules/mahjong/classes/tile.class'
import type { AbstractMahjongGame } from '@src/modules/mahjong/classes/AbstractMahjongGame'

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

export interface GameState {
    bakaze: '1z' | '2z' | '3z' | '4z'
    kyoku: number
    honba: number
    kyotaku: number
    oyaIndex: number
    currentTurnIndex: number
    turnCounter: number
    isSuddenDeath: boolean
    wallCount: number
    deadWallCount: number
    doraIndicators: string[]
    actualDora: string[]
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

export interface WinContext {
    bakaze: string // '1z', '2z', etc.
    seatWind: string // '1z', '2z', etc.
    dora: string[] // List of dora tiles (e.g. ['1m'])
    isTsumo: boolean
    isRiichi?: boolean
    isDoubleRiichi?: boolean
    isIppatsu?: boolean
    isHaitei?: boolean
    isHoutei?: boolean
    isRinshan?: boolean
    isChankan?: boolean
    isTenhou?: boolean
    isChiihou?: boolean
    winningTile?: string // Required for Ron
    uradora?: string[]
}

export interface GameRoom {
    readonly roomId: string
    readonly mahjongGame: AbstractMahjongGame
    gameStatus: 'in-progress' | 'finished'
    timer?: NodeJS.Timeout
}

export type ActionType = 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan'

export interface ActionResult {
    success: boolean
    events: GameUpdate['events']
    needsReplacementTile?: boolean
    roundEnd?: RoundEndResult
    error?: string
}

export interface RoundEndResult {
    reason: 'ron' | 'tsumo' | 'ryuukyoku'
    winners?: { winnerId: string; score: ScoreCalculation }[]
    winnerId?: string
    loserId?: string
    score?: ScoreCalculation
    abortReason?: string
}
