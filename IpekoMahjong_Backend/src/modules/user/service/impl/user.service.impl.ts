import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { AuthService } from '@src/modules/authorization/service/auth.service'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'
import {
    hashPassword,
    matchPassword,
} from '@src/modules/user/helper/bcrypt.hash'
import { UserRepository } from '@src/modules/user/repository/user.repository'
import { UserService } from '@src/modules/user/service/user.service'
import { Response } from 'express'
import { RedisService } from '@src/modules/redis/service/redis.service'

@Injectable()
export class UserServiceImpl extends UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly authService: AuthService,
        private readonly redisService: RedisService,
        private readonly prisma: PrismaClient,
    ) {
        super()
    }

    async create(userCreateDto: UserCreateDto): Promise<UserDto> {
        const createUserResult = await this.prisma.$transaction(async (tx) => {
            const type = 2
            const encryptedPassword = await hashPassword(userCreateDto.password)
            userCreateDto.password = encryptedPassword
            return await this.userRepository.create(
                {
                    ...userCreateDto,
                    type,
                },
                tx,
            )
        })
        return UserDto.fromUserEntityToDto(createUserResult)
    }

    async login(userLoginDto: UserLoginDto, res: Response) {
        // 1. password match with db user
        const dbUser = await this.prisma.$transaction(async (tx) => {
            return await this.userRepository.findByEmail(userLoginDto.email, tx)
        })

        if (dbUser === null) {
            throw new CommonError(ERROR_STATUS.LOGIN_FAIL_USER_NOT_FOUND)
        }

        const passwordMatch = await matchPassword(
            userLoginDto.password,
            dbUser.password,
        )

        if (!passwordMatch)
            throw new CommonError(ERROR_STATUS.LOGIN_FAIL_INCORRECT_PASSWORD)

        const userDto = UserDto.fromUserEntityToDto(dbUser)

        // 2. create jwts and cookies
        const accessToken = this.authService.createAccessToken(userDto)
        const refreshToken = this.authService.createRefreshToken(userDto)

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: !!(process.env.NODE_ENV === 'production'), // HTTPS에만 적용
            maxAge: 1000 * 60 * 120,
        })
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: !!(process.env.NODE_ENV === 'production'),
            maxAge: 1000 * 60 * 60 * 24 * 14,
        })

        // 3. add refreshToken to redis
        await this.redisService.set(
            `refreshToken:${userDto.id}`,
            refreshToken,
            60 * 60 * 24 * 14,
        )

        return new JwtDto(accessToken, refreshToken)
    }

    async findById(id: number) {
        const user = await this.prisma.$transaction(async (tx) =>
            this.userRepository.findById(id, tx),
        )
        return UserDto.fromUserEntityToDto(user)
    }
}
