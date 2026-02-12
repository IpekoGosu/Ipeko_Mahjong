import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { getPrismaAdapter } from '@src/common/utils/prisma-config.utils'

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super({
            adapter: getPrismaAdapter(),
            transactionOptions: {
                maxWait: 2000,
                timeout: 20000,
            },
        })
    }

    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }
}
