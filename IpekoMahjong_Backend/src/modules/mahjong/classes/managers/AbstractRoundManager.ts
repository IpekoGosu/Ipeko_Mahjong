import { Player } from '../player.class'
import { ScoreCalculation, GameUpdate } from '../../interfaces/mahjong.types'
import { Logger, Injectable } from '@nestjs/common'

@Injectable()
export abstract class AbstractRoundManager {
    protected readonly logger = new Logger(this.constructor.name)

    // Hanchan State
    public bakaze: '1z' | '2z' | '3z' | '4z' = '1z'
    public kyokuNum: number = 1
    public honba: number = 0
    public kyotaku: number = 0
    public oyaIndex: number = 0
    public isSuddenDeath: boolean = false
    public initialPlayerOrder: string[] = []

    public abstract readonly playerCount: 3 | 4

    constructor() {}

    public initialize(playerIds: string[]) {
        this.bakaze = '1z'
        this.kyokuNum = 1
        this.honba = 0
        this.kyotaku = 0
        this.oyaIndex = 0
        this.isSuddenDeath = false
        this.initialPlayerOrder = [...playerIds]
    }

    public getSeatWind(playerIndex: number): string {
        const relativePos =
            (playerIndex - this.oyaIndex + this.playerCount) % this.playerCount
        return `${relativePos + 1}z`
    }

    public getSortedPlayers(players: Player[]): Player[] {
        return [...players].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            const idxA = this.initialPlayerOrder.indexOf(a.getId())
            const idxB = this.initialPlayerOrder.indexOf(b.getId())
            return idxA - idxB
        })
    }

    public abstract endRound(
        roomId: string,
        players: Player[],
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
            abortReason?: string
        },
    ): GameUpdate

    protected abstract calculateRonBasePoints(
        winner: Player,
        loser: Player,
        score: ScoreCalculation,
    ): number

    public abstract handleGameOver(
        roomId: string,
        players: Player[],
        events: GameUpdate['events'],
    ): GameUpdate
}
