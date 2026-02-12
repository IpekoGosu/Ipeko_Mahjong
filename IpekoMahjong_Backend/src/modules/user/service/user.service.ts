import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'

export abstract class UserService {
    abstract create(userCreateDto: UserCreateDto): Promise<UserDto>
    abstract findById(id: number): Promise<UserDto>
    abstract login(
        userLoginDto: UserLoginDto,
    ): Promise<{ jwt: JwtDto; user: UserDto }>
}
