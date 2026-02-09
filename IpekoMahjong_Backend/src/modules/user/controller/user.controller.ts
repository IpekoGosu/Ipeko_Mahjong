import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { CommonSuccessResponse } from '@src/common/response/common.response'
import { JwtDto } from '@src/modules/user/dto/jwt.dto'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserDto } from '@src/modules/user/dto/user.dto'
import { UserLoginDto } from '@src/modules/user/dto/user.login.dto'
import { UserService } from '@src/modules/user/service/user.service'
import { Response } from 'express'
import {
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import { ApiSuccessResponse } from '@src/common/decorator/swagger.decorator'
import { JwtAuthGuard } from '@src/modules/authorization/jwt-auth.guard'
import { CurrentUser } from '@src/common/decorator/current-user.decorator'
import { FileInterceptor } from '@nestjs/platform-express'
import {
    downloadFileFromGoogleStorage,
    uploadFileToGoogleStorage,
} from '@src/common/utils/google.cloud'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiSuccessResponse(UserDto, 'created')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() userCreateDto: UserCreateDto) {
        const data = await this.userService.create(userCreateDto)
        return new CommonSuccessResponse(data)
    }

    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiSuccessResponse(JwtDto)
    @HttpCode(HttpStatus.OK)
    async login(@Body() userLogDto: UserLoginDto, @Res() res: Response) {
        const data = await this.userService.login(userLogDto, res)
        res.send(new CommonSuccessResponse(data))
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiSuccessResponse(UserDto)
    @HttpCode(HttpStatus.OK)
    async getMe(@CurrentUser() user: { userId: number; email: string }) {
        const data = await this.userService.findById(user.userId)
        return new CommonSuccessResponse(data)
    }

    @Post('test')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async test(@UploadedFile() file: Express.Multer.File) {
        try {
            const updloadedFileName = await uploadFileToGoogleStorage(
                file.originalname,
                file,
            )
            return new CommonSuccessResponse(updloadedFileName)
        } catch {
            throw new CommonError(
                ERROR_STATUS.GOOGLE_CLOUD_STORAGE_UPLOAD_ERROR,
            )
        }
    }

    @Get('test')
    @ApiQuery({ name: 'fileName', type: 'string' })
    async test2(@Query('fileName') fileName: string, @Res() res: Response) {
        try {
            const file = await downloadFileFromGoogleStorage(fileName)
            res.setHeader('Content-Type', 'application/octet-stream')
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=${fileName}`,
            )
            res.send(file)
        } catch {
            throw new CommonError(
                ERROR_STATUS.GOOGLE_CLOUD_STORAGE_DOWNLOAD_ERROR,
            )
        }
    }
}
