import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Res,
} from '@nestjs/common'
import { CommonSuccessResponse } from '@src/common/response/common.response'
import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'
import { UserService } from '@src/modules/user/service/user.service'
import { Response } from 'express'

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() userCreateDto: UserCreateDto,
    ): Promise<CommonSuccessResponse<UserDto>> {
        const data = await this.userService.create(userCreateDto)
        return new CommonSuccessResponse<UserDto>(data)
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() userLogDto: UserLoginDto,
        @Res() res: Response,
    ): Promise<void> {
        const data = await this.userService.login(userLogDto, res)
        res.send(new CommonSuccessResponse<JwtDto>(data))
    }
}
