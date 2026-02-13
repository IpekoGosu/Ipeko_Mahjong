import { AbstractMahjongGame } from '@src/modules/mahjong/classes/AbstractMahjongGame'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { WallSanma } from '@src/modules/mahjong/classes/wall/Wall.Sanma'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { AbstractRoundManager } from '@src/modules/mahjong/classes/managers/AbstractRoundManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'
import { AbstractRuleEffectManager } from '@src/modules/mahjong/classes/managers/AbstractRuleEffectManager'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'

import { GameRulesConfig } from '@src/modules/mahjong/interfaces/game-rules.config'

export class SanmaMahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
        ruleEffectManager: AbstractRuleEffectManager,
        ruleManager: RuleManager,
        gameRulesConfig: GameRulesConfig,
    ) {
        super(
            playerInfos,
            roundManager,
            turnManager,
            actionManager,
            ruleEffectManager,
            ruleManager,
            gameRulesConfig,
        )
    }

    protected createWall(): AbstractWall {
        return new WallSanma()
    }
}
