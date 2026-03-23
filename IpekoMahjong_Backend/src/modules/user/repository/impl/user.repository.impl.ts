import { Injectable } from '@nestjs/common'
import { Prisma, users } from '@prisma/client'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { UserRepository } from '@src/modules/user/repository/user.repository'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'

@Injectable()
export class UserRepositoryImpl extends UserRepository {
    constructor(
        private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    ) {
        super()
    }

    async findById(id: number): Promise<Omit<users, 'password'>> {
        try {
            return await this.txHost.tx.users.findUniqueOrThrow({
                where: { id },
                omit: { password: true },
            })
        } catch {
            throw new CommonError(ERROR_STATUS.DB_SELECT_ERROR)
        }
    }

    async create(usersCreateInput: Prisma.usersCreateInput): Promise<users> {
        try {
            return await this.txHost.tx.users.create({ data: usersCreateInput })
        } catch {
            throw new CommonError(ERROR_STATUS.DB_INSERT_ERROR)
        }
    }

    async findByEmail(email: string): Promise<users | null> {
        try {
            return await this.txHost.tx.users.findUnique({ where: { email } })
        } catch {
            throw new CommonError(ERROR_STATUS.DB_SELECT_ERROR)
        }
    }
}
