import dotenv from 'dotenv'
dotenv.config()

import { defineConfig } from '@prisma/config'
import { getPrismaUrl } from './src/common/utils/prisma-config.utils'

export default defineConfig({
    datasource: {
        url: getPrismaUrl(),
    },
})
