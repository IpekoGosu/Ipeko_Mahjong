import { defineConfig } from '@prisma/config'
import dotenv from 'dotenv'
import { getPrismaUrl } from './src/common/utils/prisma-config.utils'

dotenv.config()

export default defineConfig({
    datasource: {
        url: getPrismaUrl(),
    },
})
