import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { JwtAuthGuard } from '@src/modules/authorization/jwt-auth.guard'
import { JwtStrategy } from '@src/modules/authorization/jwt-strategy'
import { AUTH_SERVICE } from '@src/modules/authorization/service/auth.service'
import { AuthServiceImpl } from '@src/modules/authorization/service/impl/auth.service.impl'
import * as dotenv from 'dotenv'

dotenv.config()

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET_KEY as string,
        }),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        {
            provide: AUTH_SERVICE,
            useClass: AuthServiceImpl,
        },
    ],
    controllers: [],
    exports: [
        {
            provide: AUTH_SERVICE,
            useClass: AuthServiceImpl,
        },
    ],
})
export class AuthModule {}
