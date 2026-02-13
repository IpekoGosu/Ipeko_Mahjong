import { Module, Scope, Type } from '@nestjs/common'
import { MahjongGateway } from './mahjong.gateway'
import { GameRoomService } from './service/game-room.service'
import { GameRoomServiceImpl } from './service/impl/game-room.service.impl'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { AuthModule } from '../authorization/auth.module'
import { MahjongFactory } from './mahjong.factory'
import { RoundManager4p } from './classes/managers/RoundManager.4p'
import { RoundManagerSanma } from './classes/managers/RoundManager.Sanma'
import { TurnManager } from './classes/managers/TurnManager'
import { ActionManager4p } from './classes/managers/ActionManager.4p'
import { ActionManagerSanma } from './classes/managers/ActionManager.Sanma'
import { SimpleAI } from './classes/ai/simple.ai'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

const createTransientProvider = <T>(token: Type<T>) => ({
    provide: token,
    useFactory: () => new token(),
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
        createTransientProvider(RoundManager4p),
        createTransientProvider(RoundManagerSanma),
        createTransientProvider(TurnManager),
        createTransientProvider(ActionManager4p),
        createTransientProvider(ActionManagerSanma),
        {
            provide: MahjongAI,
            useClass: SimpleAI,
        },
    ],
    exports: [GameRoomService],
})
export class MahjongModule {}
