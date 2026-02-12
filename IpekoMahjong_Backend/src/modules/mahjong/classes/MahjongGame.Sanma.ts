import { AbstractMahjongGame } from './mahjong.game.class'
import { RoundManagerSanma } from './managers/RoundManager.Sanma'
import { TurnManager } from './managers/TurnManager'
import { ActionManagerSanma } from './managers/ActionManager.Sanma'
import { WallSanma } from './Wall.Sanma'
import { AbstractWall } from './AbstractWall'

export class SanmaMahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean }[],
        public override roundManager: RoundManagerSanma,
        public override turnManager: TurnManager,
        public override actionManager: ActionManagerSanma,
    ) {
        super(playerInfos, roundManager, turnManager, actionManager)
    }

    protected createWall(): AbstractWall {
        return new WallSanma()
    }
}
