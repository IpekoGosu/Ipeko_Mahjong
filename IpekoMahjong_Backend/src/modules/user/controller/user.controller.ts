import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common'
import { CommonSuccessResponse } from '@src/common/response/common.response'
import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'
import { UserService } from '@src/modules/user/service/user.service'
import { Response } from 'express'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiSuccessResponse } from '@src/common/decorator/swagger.decorator'
import { JwtAuthGuard } from '@src/modules/authorization/jwt-auth.guard'
import { CurrentUser } from '@src/common/decorator/current-user.decorator'

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiSuccessResponse(UserDto, 'created')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() userCreateDto: UserCreateDto,
    ): Promise<CommonSuccessResponse<UserDto>> {
        const data = await this.userService.create(userCreateDto)
        return new CommonSuccessResponse<UserDto>(data)
    }

    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiSuccessResponse(JwtDto)
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() userLogDto: UserLoginDto,
        @Res() res: Response,
    ): Promise<void> {
        const data = await this.userService.login(userLogDto, res)
        res.send(new CommonSuccessResponse<JwtDto>(data))
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiSuccessResponse(UserDto)
    @HttpCode(HttpStatus.OK)
    async getMe(
        @CurrentUser() user: { userId: number; email: string },
    ): Promise<CommonSuccessResponse<UserDto>> {
        const data = await this.userService.findById(user.userId)
        return new CommonSuccessResponse<UserDto>(data)
    }
}
