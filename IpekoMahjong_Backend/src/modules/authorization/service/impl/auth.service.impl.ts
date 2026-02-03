import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from '@src/modules/authorization/service/auth.service'
import { UserDto } from '@src/modules/user/dto/user.dto'

@Injectable()
export class AuthServiceImpl implements AuthService {
    constructor(private readonly jwtService: JwtService) {}

    createAccessToken(userDto: UserDto): string {
        return this.jwtService.sign(
            { sub: userDto.id, email: userDto.email },
            {
                expiresIn: '120m',
            },
        )
    }

    createRefreshToken(userDto: UserDto): string {
        return this.jwtService.sign(
            { sub: userDto.id, email: userDto.email },
            {
                expiresIn: '14d',
            },
        )
    }
}
