import { Player } from '@src/modules/mahjong/classes/player.class'
import {
    PossibleActions,
    ActionResult,
    ScoreCalculation,
    WinContext,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'

export class ActionManagerSanma extends AbstractActionManager {
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

            if (result.isAgari) {
                possibleActions.ron = true
                hasAction = true
                this.potentialRonners.push(player.getId())
            }

            if (isKakan) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            if (player.isRiichi) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const matches = hand.filter(
                (t) => t.getRank() === rank && t.getSuit() === suit,
            )

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
        _playerId: string,
        _actionType: string,
        _tileString: string,
        _consumedTiles: string[],
        _players: Player[],
        _currentPlayerIndex: number,
    ): ActionResult {
        // Implementation omitted for brevity
        // TODO implement Sanma
        return { success: true, events: [] }
    }

    public skipAction(
        playerId: string,
        _players: Player[],
    ): { shouldProceed: boolean; actionsRemaining: boolean } {
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
        }
        return RuleManager.verifyWin(player, tileString, winCtx)
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
        return RuleManager.verifyWin(player, lastTile.toString(), winCtx)
    }
}
