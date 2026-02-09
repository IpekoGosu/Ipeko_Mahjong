import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { getPrismaAdapter } from '@src/common/utils/prisma-config.utils'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        super({ adapter: getPrismaAdapter() })
    }

    async onModuleInit() {
        await this.$connect()
    }
}
