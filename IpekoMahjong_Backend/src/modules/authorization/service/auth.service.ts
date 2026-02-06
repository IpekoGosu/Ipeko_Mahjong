import { UserDto } from '@src/modules/user/dto/user.dto'

export abstract class AuthService {
    abstract createAccessToken(userDto: UserDto): string
    abstract createRefreshToken(userDto: UserDto): string
}
