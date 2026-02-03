import { Prisma, users } from '@prisma/client'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'

export const USER_REPOSITORY = Symbol('UserRepository')

export interface UserRepository {
    create(data: UserCreateDto, tx: Prisma.TransactionClient): Promise<users>
    findByEmail(
        email: string,
        tx: Prisma.TransactionClient,
    ): Promise<users | null>
    findById(id: number, tx: Prisma.TransactionClient): Promise<users>
}
