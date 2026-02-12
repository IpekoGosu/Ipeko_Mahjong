import { Player } from '../player.class'
import { AbstractWall } from '../AbstractWall'
import {
    PossibleActions,
    GameUpdate,
    ScoreCalculation,
} from '../../interfaces/mahjong.types'
import { RuleManager, WinContext } from '../rule.manager'
import { AbstractRoundManager } from './AbstractRoundManager'
import { TurnManager } from './TurnManager'
import { AbstractActionManager } from './AbstractActionManager'
import { Injectable, Scope } from '@nestjs/common'

@Injectable({ scope: Scope.TRANSIENT })
export class ActionManagerSanma extends AbstractActionManager {
    public getPossibleActions(
        discarderId: string,
        tileString: string,
        players: Player[],
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
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

            const result = this.verifyRon(
                player,
                tileString,
                wall,
                roundManager,
                players,
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
        roomId: string,
        _playerId: string,
        _actionType: string,
        _tileString: string,
        _consumedTiles: string[],
        _players: Player[],
        _wall: AbstractWall,
        _roundManager: AbstractRoundManager,
        _turnManager: TurnManager,
    ): GameUpdate {
        // Implementation omitted for brevity
        // TODO implement Sanma
        return { roomId, isGameOver: false, events: [] }
    }

    public skipAction(
        roomId: string,
        playerId: string,
        players: Player[],
        turnManager: TurnManager,
        _roundManager: AbstractRoundManager,
        _wall: AbstractWall,
    ): { shouldProceed: boolean; update?: GameUpdate } {
        delete this.pendingActions[playerId]
        if (Object.keys(this.pendingActions).length === 0) {
            turnManager.advanceTurn(players.length)
            return { shouldProceed: true }
        }
        return { shouldProceed: false }
    }

    public verifyRon(
        player: Player,
        tileString: string,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        players: Player[],
        isKakan: boolean = false,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const context: WinContext = {
            bakaze: roundManager.bakaze,
            seatWind: roundManager.getSeatWind(players.indexOf(player)),
            isTsumo: false,
            isChankan: isKakan,
            dora: wall.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? wall.getUradora().map((t) => t.toString())
                : [],
        }
        return RuleManager.verifyWin(player, tileString, context)
    }

    public verifyTsumo(
        player: Player,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        _turnManager: TurnManager,
        players: Player[],
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const lastTile = player.getHand().slice(-1)[0]
        const context: WinContext = {
            bakaze: roundManager.bakaze,
            seatWind: roundManager.getSeatWind(players.indexOf(player)),
            isTsumo: true,
            dora: wall.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? wall.getUradora().map((t) => t.toString())
                : [],
        }
        return RuleManager.verifyWin(player, lastTile.toString(), context)
    }
}
