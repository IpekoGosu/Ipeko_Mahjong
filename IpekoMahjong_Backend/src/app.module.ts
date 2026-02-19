import { MahjongModule } from '@src/modules/mahjong/mahjong.module'
import {
    MiddlewareConsumer,
    Module,
    NestModule,
    ValidationPipe,
} from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
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
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true, // 유효하지 않은 속성은 자동으로 제거
                forbidNonWhitelisted: true, // 유효하지 않은 속성이 있으면 400 에러
                transform: true, // 클라이언트에서 받은 데이터를 DTO 클래스에 맞게 변환
            }),
        },
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
