import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class UserLoginDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    readonly email: string

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    readonly password: string
}
