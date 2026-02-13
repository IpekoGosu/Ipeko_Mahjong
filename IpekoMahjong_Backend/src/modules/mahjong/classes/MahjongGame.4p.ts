import { AbstractMahjongGame } from './AbstractMahjongGame'
import { TurnManager } from './managers/TurnManager'
import { Wall4p } from './Wall.4p'
import { AbstractWall } from './AbstractWall'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { AbstractRoundManager } from './managers/AbstractRoundManager'
import { AbstractActionManager } from './managers/AbstractActionManager'

import { ActionManager4p } from './managers/ActionManager.4p'

export class MahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
    ) {
        super(playerInfos, roundManager, turnManager, actionManager)
    }

    protected createWall(): AbstractWall {
        return new Wall4p()
    }

    public getActionManager(): ActionManager4p {
        return this.actionManager as ActionManager4p
    }
}
