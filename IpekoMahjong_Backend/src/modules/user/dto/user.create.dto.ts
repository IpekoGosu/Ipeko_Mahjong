import { ApiProperty } from '@nestjs/swagger'
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator'

export class UserCreateDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email: string

    @ApiProperty({ example: 'John Doe', description: 'User display name' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string

    @ApiProperty({
        example: 'password123',
        description: 'User password (min 8 chars)',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(255)
    password: string
}
