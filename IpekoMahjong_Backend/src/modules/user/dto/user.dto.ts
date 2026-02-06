import { UserEntity } from '@src/modules/user/entity/user.entity'
import { ApiProperty } from '@nestjs/swagger'
import { format, toZonedTime } from 'date-fns-tz'
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

    static fromUserEntityToDto(userEntity: UserEntity) {
        return new UserDto(
            userEntity.id,
            userEntity.email,
            userEntity.name,
            userEntity.type,
            userEntity.created_at
                ? format(
                      toZonedTime(userEntity.created_at, 'Asia/Seoul'),
                      'yyyy-MM-dd HH:mm:ss',
                  )
                : '',
            userEntity.updated_at
                ? format(
                      toZonedTime(userEntity.updated_at, 'Asia/Seoul'),
                      'yyyy-MM-dd HH:mm:ss',
                  )
                : '',
        )
    }
}
