import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    PossibleActions,
    ActionResult,
    ScoreCalculation,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { Logger } from '@nestjs/common'

export abstract class AbstractActionManager {
    protected readonly logger = new Logger(this.constructor.name)

    public pendingActions: Record<string, PossibleActions> = {}
    public activeDiscard: { playerId: string; tile: Tile } | null = null
    public anyCallDeclared: boolean = false
    public rinshanFlag: boolean = false
    public pendingDoraReveal: boolean = false

    public potentialRonners: string[] = []
    public receivedRonCommands: { playerId: string; tileString: string }[] = []
    public processedRonners: string[] = []

    public reset() {
        this.pendingActions = {}
        this.activeDiscard = null
        this.anyCallDeclared = false
        this.rinshanFlag = false
        this.pendingDoraReveal = false
        this.potentialRonners = []
        this.receivedRonCommands = []
        this.processedRonners = []
    }

    public abstract getPossibleActions(
        discarderId: string,
        tileString: string,
        players: Player[],
        context: {
            bakaze: string
            dora: string[]
            playerContexts: {
                playerId: string
                seatWind: string
                uradora: string[]
            }[]
            isHoutei: boolean
        },
        isKakan?: boolean,
    ): Record<string, PossibleActions>

    public abstract performAction(
        playerId: string,
        actionType: string,
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        currentPlayerIndex: number,
    ): ActionResult

    public abstract skipAction(
        playerId: string,
        players: Player[],
    ): { shouldProceed: boolean; actionsRemaining: boolean }

    public abstract verifyRon(
        player: Player,
        tileString: string,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHoutei: boolean
        },
        isKakan?: boolean,
    ): { isAgari: boolean; score?: ScoreCalculation }

    public abstract verifyTsumo(
        player: Player,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHaitei: boolean
            rinshanFlag: boolean
        },
    ): { isAgari: boolean; score?: ScoreCalculation }
}
