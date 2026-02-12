import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { MahjongGame } from './classes/MahjongGame.4p'
import { SanmaMahjongGame } from './classes/MahjongGame.Sanma'
import { RoundManager4p } from './classes/managers/RoundManager.4p'
import { RoundManagerSanma } from './classes/managers/RoundManager.Sanma'
import { TurnManager } from './classes/managers/TurnManager'
import { ActionManager4p } from './classes/managers/ActionManager.4p'
import { ActionManagerSanma } from './classes/managers/ActionManager.Sanma'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

@Injectable()
export class MahjongFactory {
    constructor(private moduleRef: ModuleRef) {}

    async create4pGame(
        playerInfos: { id: string; isAi: boolean }[],
    ): Promise<MahjongGame> {
        // Resolve transient providers
        const roundManager = await this.moduleRef.resolve(RoundManager4p)
        const turnManager = await this.moduleRef.resolve(TurnManager)
        const actionManager = await this.moduleRef.resolve(ActionManager4p)

        const playersWithAI = await Promise.all(
            playerInfos.map(async (p) => {
                if (p.isAi) {
                    const ai = await this.moduleRef.resolve(MahjongAI)
                    return { ...p, ai }
                }
                return p
            }),
        )

        return new MahjongGame(
            playersWithAI,
            roundManager,
            turnManager,
            actionManager,
        )
    }

    async create3pGame(
        playerInfos: { id: string; isAi: boolean }[],
    ): Promise<SanmaMahjongGame> {
        const roundManager = await this.moduleRef.resolve(RoundManagerSanma)
        const turnManager = await this.moduleRef.resolve(TurnManager)
        const actionManager = await this.moduleRef.resolve(ActionManagerSanma)

        const playersWithAI = await Promise.all(
            playerInfos.map(async (p) => {
                if (p.isAi) {
                    const ai = await this.moduleRef.resolve(MahjongAI)
                    return { ...p, ai }
                }
                return p
            }),
        )

        return new SanmaMahjongGame(
            playersWithAI,
            roundManager,
            turnManager,
            actionManager,
        )
    }
}
