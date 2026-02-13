import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { SanmaMahjongGame } from '@src/modules/mahjong/classes/MahjongGame.Sanma'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { RoundManagerSanma } from '@src/modules/mahjong/classes/managers/RoundManager.Sanma'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { ActionManagerSanma } from '@src/modules/mahjong/classes/managers/ActionManager.Sanma'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { AbstractRoundManager } from '@src/modules/mahjong/classes/managers/AbstractRoundManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'
import { RuleEffectManager } from '@src/modules/mahjong/classes/managers/RuleEffectManager'
import { AbstractRuleEffectManager } from '@src/modules/mahjong/classes/managers/AbstractRuleEffectManager'

@Injectable()
export class MahjongFactory {
    constructor(private moduleRef: ModuleRef) {}

    async create4pGame(
        playerInfos: { id: string; isAi: boolean }[],
    ): Promise<MahjongGame> {
        // Resolve transient providers
        const roundManager =
            await this.moduleRef.resolve<AbstractRoundManager>(RoundManager4p)
        const turnManager = await this.moduleRef.resolve(TurnManager)
        const actionManager =
            await this.moduleRef.resolve<AbstractActionManager>(ActionManager4p)
        const ruleEffectManager =
            await this.moduleRef.resolve<AbstractRuleEffectManager>(
                RuleEffectManager,
            )

        const playersWithAI = await this.createPlayersWithAI(playerInfos)

        return new MahjongGame(
            playersWithAI,
            roundManager,
            turnManager,
            actionManager,
            ruleEffectManager,
        )
    }

    async create3pGame(
        playerInfos: { id: string; isAi: boolean }[],
    ): Promise<SanmaMahjongGame> {
        const roundManager =
            await this.moduleRef.resolve<AbstractRoundManager>(
                RoundManagerSanma,
            )
        const turnManager = await this.moduleRef.resolve(TurnManager)
        const actionManager =
            await this.moduleRef.resolve<AbstractActionManager>(
                ActionManagerSanma,
            )
        const ruleEffectManager =
            await this.moduleRef.resolve<AbstractRuleEffectManager>(
                RuleEffectManager,
            )

        const playersWithAI = await this.createPlayersWithAI(playerInfos)

        return new SanmaMahjongGame(
            playersWithAI,
            roundManager,
            turnManager,
            actionManager,
            ruleEffectManager,
        )
    }

    private async createPlayersWithAI(
        playerInfos: { id: string; isAi: boolean }[],
    ) {
        return Promise.all(
            playerInfos.map(async (p) => {
                if (p.isAi) {
                    const ai = await this.moduleRef.resolve(MahjongAI)
                    return { ...p, ai }
                }
                return p
            }),
        )
    }
}
