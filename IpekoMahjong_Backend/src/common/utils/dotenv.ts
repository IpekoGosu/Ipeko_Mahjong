import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function getEnv(key: string, required = true, defaultValue = ''): string {
    const value = process.env[key]
    if (value === undefined || value === '') {
        if (required) {
            throw new Error(`Environment variable ${key} is missing`)
        }
        return defaultValue
    }
    return value
}

function getEnvNumber(key: string, required = true, defaultValue = 0): number {
    const value = process.env[key]
    if (value === undefined || value === '') {
        if (required) {
            throw new Error(`Environment variable ${key} is missing`)
        }
        return defaultValue
    }
    const num = Number(value)
    if (isNaN(num)) {
        throw new Error(`Environment variable ${key} must be a number`)
    }
    return num
}

export const ENV = {
    // Server
    PORT: getEnvNumber('PORT', false, 3000),
    NODE_ENV: getEnv('NODE_ENV', false, 'development'),

    // JWT
    // Supporting both keys but preferring JWT_SECRET_KEY as it is used in AuthModule
    JWT_SECRET_KEY: getEnv('JWT_SECRET_KEY', true),

    // Database
    DB_ENV: getEnv('DB_ENV', false, 'localhost'),
    DATABASE_NAME: getEnv('DATABASE_NAME', true),
    DATABASE_PORT: getEnvNumber('DATABASE_PORT', false, 3306),

    // Local DB
    LOCAL_DATABASE_HOST: getEnv('LOCAL_DATABASE_HOST', false),
    LOCAL_DATABASE_USER: getEnv('LOCAL_DATABASE_USER', false),
    LOCAL_DATABASE_PASSWORD: getEnv('LOCAL_DATABASE_PASSWORD', false),

    // Google Cloud DB
    GOOGLE_DATABASE_HOST: getEnv('GOOGLE_DATABASE_HOST', false),
    GOOGLE_DATABASE_USER: getEnv('GOOGLE_DATABASE_USER', false),
    GOOGLE_DATABASE_PASSWORD: getEnv('GOOGLE_DATABASE_PASSWORD', false),
} as const
