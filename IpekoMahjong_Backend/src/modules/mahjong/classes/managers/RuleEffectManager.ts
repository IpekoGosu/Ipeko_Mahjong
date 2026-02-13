import { Player } from '@src/modules/mahjong/classes/player.class'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { AbstractRuleEffectManager } from '@src/modules/mahjong/classes/managers/AbstractRuleEffectManager'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Injectable } from '@nestjs/common'

@Injectable()
export class RuleEffectManager extends AbstractRuleEffectManager {
    constructor(private readonly ruleManager: RuleManager) {
        super()
    }

    public handleRiichi(
        player: Player,
        tileString: string,
        turnCounter: number,
        wall: AbstractWall,
        anyCallDeclared: boolean,
    ): { success: boolean; error?: string } {
        // Rule: Must have 4+ tiles in wall (Tenhou rule)
        if (wall.getRemainingTiles() < 4) {
            return {
                success: false,
                error: 'Cannot declare Riichi with less than 4 tiles remaining',
            }
        }

        const validRiichiDiscards = this.ruleManager.getRiichiDiscards(player)
        if (
            player.isRiichi ||
            !player.isHandClosed() ||
            !validRiichiDiscards.includes(tileString)
        ) {
            return { success: false, error: 'Invalid Riichi declaration' }
        }

        if (player.points < 1000) {
            return { success: false, error: 'Not enough points for Riichi' }
        }

        player.isRiichi = true
        player.ippatsuEligible = true
        player.riichiDeclarationTurn = turnCounter
        player.points -= 1000

        if (!anyCallDeclared && player.getDiscards().length === 0) {
            // This is before the current discard is added to p.discards
            // AbstractMahjongGame calls player.discard() after handleRiichi or similar
            // Actually player.getDiscards().length === 1 if we call it after player.discard()
            // In AbstractMahjongGame, discardTile calls player.discard() AFTER some checks.
            player.isDoubleRiichi = true
        }

        return { success: true }
    }

    public updateFuritenStatus(player: Player): void {
        const standardFuriten = this.ruleManager.calculateFuriten(player)
        player.isFuriten =
            standardFuriten ||
            player.isTemporaryFuriten ||
            player.isRiichiFuriten
    }

    public checkSuufuuRenda(
        tileString: string,
        turnCounter: number,
        anyCallDeclared: boolean,
        turnManager: TurnManager,
    ): boolean {
        if (anyCallDeclared || turnCounter >= 4) return false

        const wind = tileString[1] === 'z' ? tileString : null
        if (turnCounter === 0) {
            if (wind) {
                turnManager.firstTurnDiscards = {
                    wind: tileString,
                    count: 1,
                }
            } else {
                turnManager.firstTurnDiscards = null
            }
        } else {
            if (
                wind &&
                turnManager.firstTurnDiscards &&
                turnManager.firstTurnDiscards.wind === tileString
            ) {
                turnManager.firstTurnDiscards.count++
            } else {
                turnManager.firstTurnDiscards = null
            }
        }

        return turnManager.firstTurnDiscards?.count === 4
    }

    public checkSuuchaRiichi(players: Player[]): boolean {
        return players.every((p) => p.isRiichi)
    }

    public handleIppatsuExpiration(player: Player, turnCounter: number): void {
        if (player.isRiichi && player.ippatsuEligible) {
            if (player.riichiDeclarationTurn !== turnCounter) {
                player.ippatsuEligible = false
            }
        }
    }

    public checkKyuushuKyuuhai(
        player: Player,
        anyCallDeclared: boolean,
    ): { success: boolean; error?: string } {
        if (anyCallDeclared || player.getDiscards().length > 0) {
            return { success: false, error: 'Too late for Kyuushu Kyuuhai' }
        }

        const terminals = this.ruleManager.countTerminalsAndHonors(player)
        if (terminals < 9) {
            return { success: false, error: 'Not enough terminals/honors' }
        }

        return { success: true }
    }
}
