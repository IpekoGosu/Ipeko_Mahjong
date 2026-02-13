import { MahjongModule } from '@src/modules/mahjong/mahjong.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import {
    CommonErrorFilter,
    HttpErrorFilter,
    AllExceptionsFilter,
} from '@src/common/filter/error.filter'
import { UserModule } from '@src/modules/user/user.module'
import { LoggerMiddleware } from '@src/common/logger/logger.middleware'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

@Module({
    imports: [UserModule, MahjongModule],
    providers: [
        {
            provide: APP_FILTER,
            useClass: CommonErrorFilter,
        },
        {
            provide: APP_FILTER,
            useClass: HttpErrorFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        WinstonLoggerService,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
