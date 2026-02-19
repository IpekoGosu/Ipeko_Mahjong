import { Player } from '@src/modules/mahjong/classes/player.class'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'

export abstract class AbstractRuleEffectManager {
    public abstract handleRiichi(
        player: Player,
        tileString: string,
        turnCounter: number,
        wall: AbstractWall,
        anyCallDeclared: boolean,
    ): { success: boolean; error?: string }

    public abstract updateFuritenStatus(player: Player): void

    public abstract checkSuufuuRenda(
        tileString: string,
        turnCounter: number,
        anyCallDeclared: boolean,
        turnManager: TurnManager,
    ): boolean

    public abstract checkSuuchaRiichi(players: Player[]): boolean

    public abstract handleIppatsuExpiration(
        player: Player,
        turnCounter: number,
    ): void

    public abstract checkKyuushuKyuuhai(
        player: Player,
        anyCallDeclared: boolean,
    ): { success: boolean; error?: string }

    public abstract checkSuukanSettsu(players: Player[]): {
        isAbortive: boolean
    }

    public abstract checkSanchahou(winnersCount: number): boolean
}
