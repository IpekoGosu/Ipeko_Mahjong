import { Prisma, users } from '@prisma/client'

export const USER_REPOSITORY = Symbol('UserRepository')

export abstract class UserRepository {
    abstract create(data: Prisma.usersCreateInput): Promise<users>
    abstract findByEmail(email: string): Promise<users | null>
    abstract findById(id: number): Promise<Omit<users, 'password'>>
}
