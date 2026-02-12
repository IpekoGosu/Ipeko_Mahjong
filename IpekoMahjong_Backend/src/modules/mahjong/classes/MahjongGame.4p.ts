import { AbstractMahjongGame } from './mahjong.game.class'
import { RoundManager4p } from './managers/RoundManager.4p'
import { TurnManager } from './managers/TurnManager'
import { ActionManager4p } from './managers/ActionManager.4p'
import { Wall4p } from './Wall.4p'
import { AbstractWall } from './AbstractWall'

export class MahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean }[],
        public override roundManager: RoundManager4p,
        public override turnManager: TurnManager,
        public override actionManager: ActionManager4p,
    ) {
        super(playerInfos, roundManager, turnManager, actionManager)
    }

    protected createWall(): AbstractWall {
        return new Wall4p()
    }
}
