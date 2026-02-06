import { Module } from '@nestjs/common'
import { AuthModule } from '@src/modules/authorization/auth.module'
import { PrismaModule } from '@src/modules/prisma/prisma.module'
import { RedisModule } from '@src/modules/redis/redis.module'
import { UserController } from '@src/modules/user/controller/user.controller'
import { UserRepositoryImpl } from '@src/modules/user/repository/impl/user.repository.impl'
import { UserRepository } from '@src/modules/user/repository/user.repository'
import { UserServiceImpl } from '@src/modules/user/service/impl/user.service.impl'
import { UserService } from '@src/modules/user/service/user.service'

@Module({
    imports: [PrismaModule, AuthModule, RedisModule],
    controllers: [UserController],
    providers: [
        {
            provide: UserService,
            useClass: UserServiceImpl,
        },
        {
            provide: UserRepository,
            useClass: UserRepositoryImpl,
        },
    ],
})
export class UserModule {}
