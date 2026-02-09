import { ApiProperty } from '@nestjs/swagger'
import { users } from '@prisma/client'
import { convertUtcToKst } from '@src/common/utils/date.utils'
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
    readonly id: number

    @ApiProperty()
    readonly email: string

    @ApiProperty()
    readonly name: string

    @ApiProperty()
    readonly type: number

    @ApiProperty()
    readonly createdAt: string

    @ApiProperty()
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
