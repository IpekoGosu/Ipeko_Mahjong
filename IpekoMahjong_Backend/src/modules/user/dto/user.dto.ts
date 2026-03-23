import { ApiProperty } from '@nestjs/swagger'
import { users } from '@prisma/client'
import { convertUtcToKst } from '@src/common/utils/date.utils'
import { IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class UserDto {
    constructor(
        id: number,
        email: string,
        name: string,
        type: number,
        createdAt: string,
        updatedAt: string,
    ) {
        this.id = id
        this.email = email
        this.name = name
        this.type = type
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }

    @ApiProperty()
    @IsInt()
    @IsNotEmpty()
    readonly id: number

    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    readonly email: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly name: string

    @ApiProperty()
    @IsInt()
    @IsNotEmpty()
    readonly type: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly createdAt: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly updatedAt: string

    static fromUserEntityToDto(userEntity: Omit<users, 'password'>) {
        return new UserDto(
            userEntity.id,
            userEntity.email,
            userEntity.name,
            userEntity.type,
            convertUtcToKst(userEntity.created_at),
            convertUtcToKst(userEntity.updated_at),
        )
    }
}
