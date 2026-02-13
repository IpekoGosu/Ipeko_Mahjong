import { AbstractMahjongGame } from './AbstractMahjongGame'
import { TurnManager } from './managers/TurnManager'
import { WallSanma } from './Wall.Sanma'
import { AbstractWall } from './AbstractWall'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { AbstractRoundManager } from './managers/AbstractRoundManager'
import { AbstractActionManager } from './managers/AbstractActionManager'

export class SanmaMahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
    ) {
        super(playerInfos, roundManager, turnManager, actionManager)
    }

    protected createWall(): AbstractWall {
        return new WallSanma()
    }
}
