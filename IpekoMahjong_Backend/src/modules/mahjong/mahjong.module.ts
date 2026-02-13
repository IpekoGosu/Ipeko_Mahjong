import { Module, Scope, Type } from '@nestjs/common'
import { MahjongGateway } from '@src/modules/mahjong/mahjong.gateway'
import { GameRoomService } from '@src/modules/mahjong/service/game-room.service'
import { GameRoomServiceImpl } from '@src/modules/mahjong/service/impl/game-room.service.impl'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { AuthModule } from '@src/modules/authorization/auth.module'
import { MahjongFactory } from '@src/modules/mahjong/mahjong.factory'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { RoundManagerSanma } from '@src/modules/mahjong/classes/managers/RoundManager.Sanma'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { ActionManagerSanma } from '@src/modules/mahjong/classes/managers/ActionManager.Sanma'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { RuleEffectManager } from '@src/modules/mahjong/classes/managers/RuleEffectManager'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'

const createTransientProvider = <T>(token: Type<T>) => ({
    provide: token,
    useClass: token,
    scope: Scope.TRANSIENT,
})

@Module({
    imports: [AuthModule],
    providers: [
        MahjongGateway,
        {
            provide: GameRoomService,
            useClass: GameRoomServiceImpl,
        },
        WinstonLoggerService,
        MahjongFactory,
        RuleManager,
        createTransientProvider(RoundManager4p),
        createTransientProvider(RoundManagerSanma),
        createTransientProvider(TurnManager),
        createTransientProvider(ActionManager4p),
        createTransientProvider(ActionManagerSanma),
        createTransientProvider(RuleEffectManager),
        {
            provide: MahjongAI,
            useClass: SimpleAI,
        },
    ],
    exports: [GameRoomService],
})
export class MahjongModule {}
