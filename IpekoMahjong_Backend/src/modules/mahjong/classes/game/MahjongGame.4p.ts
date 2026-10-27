import { AbstractMahjongGame } from '@src/modules/mahjong/classes/game/AbstractMahjongGame'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { Wall4p } from '@src/modules/mahjong/classes/wall/Wall.4p'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { AbstractRoundManager } from '@src/modules/mahjong/classes/managers/AbstractRoundManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'
import { AbstractRuleEffectManager } from '@src/modules/mahjong/classes/managers/AbstractRuleEffectManager'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'

import { GameRulesConfig } from '@src/modules/mahjong/interfaces/game-rules.config'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

export class MahjongGame extends AbstractMahjongGame {
    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
        ruleEffectManager: AbstractRuleEffectManager,
        ruleManager: RuleManager,
        gameRulesConfig: GameRulesConfig,
        protected readonly logger: WinstonLoggerService,
    ) {
        super(
            playerInfos,
            roundManager,
            turnManager,
            actionManager,
            ruleEffectManager,
            ruleManager,
            gameRulesConfig,
            logger,
        )
    }

    protected createWall(): AbstractWall {
        return new Wall4p()
    }
}
