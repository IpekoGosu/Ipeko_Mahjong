import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { ENV } from '@src/common/utils/env'

export interface DbConfig {
    host: string
    port: number
    user: string
    password?: string
    database: string
    ssl?: { rejectUnauthorized: boolean }
    isCloud: boolean
}

export function getDbConfig(): DbConfig {
    const dbEnv = ENV.DB_ENV
    const isCloud = dbEnv === 'google'
    return {
        host: isCloud ? ENV.GOOGLE_DATABASE_HOST : ENV.LOCAL_DATABASE_HOST,
        port: ENV.DATABASE_PORT,
        user: isCloud ? ENV.GOOGLE_DATABASE_USER : ENV.LOCAL_DATABASE_USER,
        password: isCloud
            ? ENV.GOOGLE_DATABASE_PASSWORD
            : ENV.LOCAL_DATABASE_PASSWORD,
        database: ENV.DATABASE_NAME,
        ssl: isCloud ? { rejectUnauthorized: false } : undefined,
        isCloud,
    }
}

export function getPrismaAdapter() {
    return new PrismaMariaDb(getDbConfig())
}

export function getPrismaUrl() {
    const config = getDbConfig()
    const encodedPassword = encodeURIComponent(config.password || '')
    const url = `mysql://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}`
    return config.isCloud
        ? `${url}?sslmode=require&sslaccept=accept_invalid_certs`
        : url
}
