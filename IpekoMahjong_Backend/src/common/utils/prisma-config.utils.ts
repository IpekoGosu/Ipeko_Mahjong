import { PrismaMariaDb } from '@prisma/adapter-mariadb'

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
    const dbEnv = process.env.DB_ENV || 'localhost'
    const isCloud = dbEnv === 'google'
    return {
        host: (isCloud
            ? process.env.GOOGLE_DATABASE_HOST
            : process.env.LOCAL_DATABASE_HOST) as string,
        port: Number(process.env.DATABASE_PORT),
        user: (isCloud
            ? process.env.GOOGLE_DATABASE_USER
            : process.env.LOCAL_DATABASE_USER) as string,
        password: isCloud
            ? process.env.GOOGLE_DATABASE_PASSWORD
            : process.env.LOCAL_DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME as string,
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
    return config.isCloud ? `${url}?sslmode=require&sslaccept=accept_invalid_certs` : url
}
