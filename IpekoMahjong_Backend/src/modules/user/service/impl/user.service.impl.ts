import { Injectable } from '@nestjs/common'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { AuthService } from '@src/modules/authorization/service/auth.service'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'
import { hashPassword, matchPassword } from '@src/common/utils/bcrypt.hash'
import { UserRepository } from '@src/modules/user/repository/user.repository'
import { UserService } from '@src/modules/user/service/user.service'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class UserServiceImpl extends UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly authService: AuthService,
    ) {
        super()
    }

    @Transactional()
    async create(userCreateDto: UserCreateDto): Promise<UserDto> {
        const type = 2
        const encryptedPassword = await hashPassword(userCreateDto.password)
        const createInput = {
            ...userCreateDto,
            password: encryptedPassword,
            type,
        }
        const createUserResult = await this.userRepository.create(createInput)
        return UserDto.fromUserEntityToDto(createUserResult)
    }

    @Transactional()
    async login(userLoginDto: UserLoginDto) {
        // 1. password match with db user
        const dbUser = await this.userRepository.findByEmail(userLoginDto.email)

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

        // 2. create jwts
        const accessToken = this.authService.createAccessToken(userDto)
        const refreshToken = this.authService.createRefreshToken(userDto)

        const jwt = new JwtDto(accessToken, refreshToken)
        return { jwt, user: userDto }
    }

    @Transactional()
    async findById(id: number) {
        const user = await this.userRepository.findById(id)
        return UserDto.fromUserEntityToDto(user)
    }
}
