import { AbstractMahjongGame } from './AbstractMahjongGame'
import { RoundManagerSanma } from './managers/RoundManager.Sanma'
import { TurnManager } from './managers/TurnManager'
import { ActionManagerSanma } from './managers/ActionManager.Sanma'
import { WallSanma } from './Wall.Sanma'
import { AbstractWall } from './AbstractWall'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

export class SanmaMahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: RoundManagerSanma,
        turnManager: TurnManager,
        actionManager: ActionManagerSanma,
    ) {
        super(playerInfos, roundManager, turnManager, actionManager)
    }

    protected createWall(): AbstractWall {
        return new WallSanma()
    }
}
