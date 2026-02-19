import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { RoundManagerSanma } from '@src/modules/mahjong/classes/managers/RoundManager.Sanma'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { ActionManagerSanma } from '@src/modules/mahjong/classes/managers/ActionManager.Sanma'
import { RuleEffectManager } from '@src/modules/mahjong/classes/managers/RuleEffectManager'
import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { SanmaMahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.Sanma'
import {
    DEFAULT_4P_RULES,
    DEFAULT_3P_RULES,
} from '@src/modules/mahjong/interfaces/game-rules.config'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

export function createTestGame(
    playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
) {
    const ruleManager = new RuleManager()
    const roundManager = new RoundManager4p(ruleManager)
    const turnManager = new TurnManager(ruleManager)
    const actionManager = new ActionManager4p(ruleManager)
    const ruleEffectManager = new RuleEffectManager(ruleManager)

    return new MahjongGame(
        playerInfos,
        roundManager,
        turnManager,
        actionManager,
        ruleEffectManager,
        ruleManager,
        DEFAULT_4P_RULES,
    )
}

export function createTestSanmaGame(
    playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
) {
    const ruleManager = new RuleManager()
    const roundManager = new RoundManagerSanma(ruleManager)
    const turnManager = new TurnManager(ruleManager)
    const actionManager = new ActionManagerSanma(ruleManager)
    const ruleEffectManager = new RuleEffectManager(ruleManager)

    return new SanmaMahjongGame(
        playerInfos,
        roundManager,
        turnManager,
        actionManager,
        ruleEffectManager,
        ruleManager,
        DEFAULT_3P_RULES,
    )
}

export function createTestManagers() {
    const ruleManager = new RuleManager()
    return {
        ruleManager,
        roundManager: new RoundManager4p(ruleManager),
        turnManager: new TurnManager(ruleManager),
        actionManager: new ActionManager4p(ruleManager),
        ruleEffectManager: new RuleEffectManager(ruleManager),
    }
}

export function createTestSanmaManagers() {
    const ruleManager = new RuleManager()
    return {
        ruleManager,
        roundManager: new RoundManagerSanma(ruleManager),
        turnManager: new TurnManager(ruleManager),
        actionManager: new ActionManagerSanma(ruleManager),
        ruleEffectManager: new RuleEffectManager(ruleManager),
    }
}
