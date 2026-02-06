import { Injectable } from '@nestjs/common'
import { Prisma, users } from '@prisma/client'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { UserRepository } from '@src/modules/user/repository/user.repository'

@Injectable()
export class UserRepositoryImpl extends UserRepository {
    constructor() {
        super()
    }

    async findById(
        id: number,
        tx: Prisma.TransactionClient,
    ): Promise<Omit<users, 'password'>> {
        try {
            return await tx.users.findUniqueOrThrow({
                where: { id },
                omit: { password: true },
            })
        } catch (error) {
            console.error(error)
            throw new CommonError(ERROR_STATUS.DB_SELECT_ERROR)
        }
    }

    async create(
        usersCreateInput: Prisma.usersCreateInput,
        tx: Prisma.TransactionClient,
    ): Promise<users> {
        try {
            return await tx.users.create({ data: usersCreateInput })
        } catch (error) {
            console.error(error)
            throw new CommonError(ERROR_STATUS.DB_INSERT_ERROR)
        }
    }

    async findByEmail(
        email: string,
        tx: Prisma.TransactionClient,
    ): Promise<users | null> {
        try {
            return await tx.users.findUnique({ where: { email } })
        } catch (error) {
            console.error(error)
            throw new CommonError(ERROR_STATUS.DB_SELECT_ERROR)
        }
    }
}
