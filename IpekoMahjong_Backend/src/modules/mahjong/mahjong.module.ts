import { Module } from '@nestjs/common'
import { MahjongGateway } from './mahjong.gateway'
import { GameRoomService } from './service/game-room.service'
import { GameRoomServiceImpl } from './service/impl/game-room.service.impl'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

@Module({
    providers: [
        MahjongGateway,
        {
            provide: GameRoomService,
            useClass: GameRoomServiceImpl,
        },
        WinstonLoggerService,
    ],
})
export class MahjongModule {}
