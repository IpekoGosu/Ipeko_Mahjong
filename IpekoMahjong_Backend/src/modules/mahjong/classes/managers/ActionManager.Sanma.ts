import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    PossibleActions,
    ActionResult,
    ScoreCalculation,
    WinContext,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ActionManagerSanma extends AbstractActionManager {
    constructor(private readonly ruleManager: RuleManager) {
        super()
    }

    public getPossibleActions(
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
        isKakan: boolean = false,
    ): Record<string, PossibleActions> {
        const discarder = players.find((p) => p.getId() === discarderId)
        if (!discarder) return {}

        this.potentialRonners = []
        this.receivedRonCommands = []
        this.processedRonners = []

        const actions: Record<string, PossibleActions> = {}

        players.forEach((player) => {
            if (player.getId() === discarderId) return

            const hand = player.getHand()
            const possibleActions: PossibleActions = {}
            let hasAction = false

            const playerCtx = context.playerContexts.find(
                (c) => c.playerId === player.getId(),
            )!

            const result = this.verifyRon(
                player,
                tileString,
                {
                    bakaze: context.bakaze,
                    seatWind: playerCtx.seatWind,
                    dora: context.dora,
                    uradora: playerCtx.uradora,
                    isHoutei: context.isHoutei,
                },
                isKakan,
            )

            const isFuriten =
                player.isFuriten ||
                player.isTemporaryFuriten ||
                player.isRiichiFuriten

            if (result.isAgari && !isFuriten) {
                possibleActions.ron = true
                hasAction = true
                this.potentialRonners.push(player.getId())
            }

            if (isKakan) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            // Houtei restriction: cannot call last tile except for Ron
            if (context.isHoutei) {
                if (possibleActions.ron) {
                    actions[player.getId()] = { ron: true }
                }
                return
            }

            if (player.isRiichi) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            const targetTile = Tile.fromString(tileString)
            const matches = hand.filter((t) => t.equalsIgnoreRed(targetTile))

            if (matches.length >= 2) {
                possibleActions.pon = true
                hasAction = true
            }
            if (matches.length >= 3) {
                possibleActions.kan = true
                hasAction = true
            }

            // Sanma: No Chi.

            if (hasAction) {
                actions[player.getId()] = possibleActions
            }
        })

        this.pendingActions = actions
        return actions
    }

    public performAction(
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        currentPlayerIndex: number,
    ): ActionResult {
        const player = players.find((p) => p.getId() === playerId)!
        const playerIndex = players.indexOf(player)

        if (actionType === 'ron') {
            return this.handleRonAction(playerId, tileString)
        }

        if (this.potentialRonners.length > 0) {
            return {
                success: false,
                error: 'Wait for Ron decisions',
                events: [],
            }
        }

        if (actionType === 'ankan' || actionType === 'kakan') {
            if (currentPlayerIndex !== playerIndex) {
                return { success: false, error: 'Not your turn', events: [] }
            }
        } else {
            const pending = this.pendingActions[playerId]
            if (!pending || !pending[actionType]) {
                return {
                    success: false,
                    error: 'Action not allowed',
                    events: [],
                }
            }
        }

        return this.handleMeldAction(
            player,
            actionType,
            tileString,
            consumedTiles,
            players,
        )
    }

    public skipAction(
        playerId: string,
        players: Player[],
    ): { shouldProceed: boolean; actionsRemaining: boolean } {
        const pending = this.pendingActions[playerId]
        if (pending && pending.ron) {
            const player = players.find((p) => p.getId() === playerId)
            if (player) {
                player.isTemporaryFuriten = true
                if (player.isRiichi) player.isRiichiFuriten = true
            }
        }
        delete this.pendingActions[playerId]

        if (Object.keys(this.pendingActions).length === 0) {
            return { shouldProceed: true, actionsRemaining: false }
        }
        return { shouldProceed: false, actionsRemaining: true }
    }

    public verifyRon(
        player: Player,
        tileString: string,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHoutei: boolean
        },
        isKakan: boolean = false,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const winCtx: WinContext = {
            bakaze: context.bakaze,
            seatWind: context.seatWind,
            isTsumo: false,
            isIppatsu: player.ippatsuEligible,
            isChankan: isKakan,
            isHoutei: context.isHoutei,
            dora: context.dora,
            uradora: context.uradora,
            isRiichi: player.isRiichi,
            isDoubleRiichi: player.isDoubleRiichi,
        }
        return this.ruleManager.verifyWin(player, tileString, winCtx, true)
    }

    public verifyTsumo(
        player: Player,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHaitei: boolean
            rinshanFlag: boolean
        },
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const lastTile = player.getHand().slice(-1)[0]
        const winCtx: WinContext = {
            bakaze: context.bakaze,
            seatWind: context.seatWind,
            isTsumo: true,
            isRiichi: player.isRiichi,
            isIppatsu: player.ippatsuEligible,
            isRinshan: context.rinshanFlag,
            isHaitei: context.isHaitei,
            dora: context.dora,
            uradora: context.uradora,
        }
        return this.ruleManager.verifyWin(
            player,
            lastTile.toString(),
            winCtx,
            true,
        )
    }
}
