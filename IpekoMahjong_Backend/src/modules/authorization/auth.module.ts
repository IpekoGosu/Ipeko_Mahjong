import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { JwtAuthGuard } from '@src/modules/authorization/jwt-auth.guard'
import { JwtStrategy } from '@src/modules/authorization/jwt-strategy'
import { AuthService } from '@src/modules/authorization/service/auth.service'
import { AuthServiceImpl } from '@src/modules/authorization/service/impl/auth.service.impl'
import { ENV } from '@src/common/utils/dotenv'

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: ENV.JWT_SECRET_KEY,
        }),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        {
            provide: AuthService,
            useClass: AuthServiceImpl,
        },
    ],
    controllers: [],
    exports: [
        {
            provide: AuthService,
            useClass: AuthServiceImpl,
        },
        JwtModule,
    ],
})
export class AuthModule {}
