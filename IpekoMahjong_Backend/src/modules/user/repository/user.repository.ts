import { Prisma, users } from '@prisma/client'

export const USER_REPOSITORY = Symbol('UserRepository')

export abstract class UserRepository {
    abstract create(
        data: Prisma.usersCreateInput,
        tx: Prisma.TransactionClient,
    ): Promise<users>
    abstract findByEmail(
        email: string,
        tx: Prisma.TransactionClient,
    ): Promise<users | null>
    abstract findById(id: number, tx: Prisma.TransactionClient): Promise<users>
}
