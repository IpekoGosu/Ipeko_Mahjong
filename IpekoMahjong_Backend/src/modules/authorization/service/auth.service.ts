import { UserDto } from '@src/modules/user/dto/user.dto'

export const AUTH_SERVICE = Symbol('AuthService')

export interface AuthService {
    createAccessToken(userDto: UserDto): string
    createRefreshToken(userDto: UserDto): string
}
