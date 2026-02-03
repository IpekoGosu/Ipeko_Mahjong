import { UserEntity } from '@src/modules/user/entity/user.entity'
import { format, toZonedTime } from 'date-fns-tz'
export class UserDto {
    constructor(
        public readonly id: number,
        public readonly email: string,
        public readonly name: string,
        public readonly type: number,
        public readonly createdAt: string,
        public readonly updatedAt: string,
    ) {}

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
