import { Player } from '../player.class'
import { AbstractWall } from '../AbstractWall'
import { Tile } from '../tile.class'
import {
    PossibleActions,
    GameUpdate,
    ScoreCalculation,
} from '../../interfaces/mahjong.types'
import { AbstractRoundManager } from './AbstractRoundManager'
import { TurnManager } from './TurnManager'
import { Logger, Injectable } from '@nestjs/common'

@Injectable()
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

    constructor() {}

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
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        isKakan?: boolean,
    ): Record<string, PossibleActions>

    public abstract performAction(
        roomId: string,
        playerId: string,
        actionType: string,
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
    ): GameUpdate

    public abstract skipAction(
        roomId: string,
        playerId: string,
        players: Player[],
        turnManager: TurnManager,
        _roundManager: AbstractRoundManager,
        _wall: AbstractWall,
    ): { shouldProceed: boolean; update?: GameUpdate }

    public abstract verifyRon(
        player: Player,
        tileString: string,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        players: Player[],
        isKakan?: boolean,
    ): { isAgari: boolean; score?: ScoreCalculation }

    public abstract verifyTsumo(
        player: Player,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        players: Player[],
    ): { isAgari: boolean; score?: ScoreCalculation }
}
