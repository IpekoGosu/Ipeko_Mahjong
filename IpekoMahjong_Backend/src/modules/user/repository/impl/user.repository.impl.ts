import { Injectable } from '@nestjs/common'
import { Prisma, users } from '@prisma/client'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { UserCreateDto } from '@src/modules/user/dto/user.create.dto'
import { UserRepository } from '@src/modules/user/repository/user.repository'

@Injectable()
export class UserRepositoryImpl implements UserRepository {
    constructor() {}

    async findById(id: number, tx: Prisma.TransactionClient): Promise<users> {
        try {
            return await tx.users.findUniqueOrThrow({ where: { id } })
        } catch (error) {
            console.error(error)
            throw new CommonError(ERROR_STATUS.DB_SELECT_ERROR)
        }
    }

    async create(
        userCreateDto: UserCreateDto,
        tx: Prisma.TransactionClient,
    ): Promise<users> {
        try {
            return await tx.users.create({ data: userCreateDto })
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
