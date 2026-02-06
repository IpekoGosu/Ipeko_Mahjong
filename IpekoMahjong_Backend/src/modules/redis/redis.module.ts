import { Module } from '@nestjs/common'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { RedisServiceImpl } from '@src/modules/redis/service/impl/redis.service.impl'
import { RedisService } from '@src/modules/redis/service/redis.service'

@Module({
    providers: [
        {
            provide: RedisService,
            useClass: RedisServiceImpl,
        },
        WinstonLoggerService,
    ],
    exports: [
        {
            provide: RedisService,
            useClass: RedisServiceImpl,
        },
    ],
})
export class RedisModule {}
