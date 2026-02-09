import * as dotenv from 'dotenv'
import * as path from 'path'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

// Load .env file initially for local development
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

/**
 * Initial ENV object.
 * Note: These values might be overwritten by initializeEnv() if USE_GSM is true.
 */
export const ENV = {
    PORT: 3000,
    NODE_ENV: 'development',
    JWT_SECRET_KEY: '',
    DB_ENV: 'localhost',
    DATABASE_NAME: '',
    DATABASE_PORT: 3306,
    LOCAL_DATABASE_HOST: '',
    LOCAL_DATABASE_USER: '',
    LOCAL_DATABASE_PASSWORD: '',
    GOOGLE_DATABASE_HOST: '',
    GOOGLE_DATABASE_USER: '',
    GOOGLE_DATABASE_PASSWORD: '',
    GOOGLE_CLOUD_STORAGE_BUCKET: 'ipeko-mahjong',
}

let isInitialized = false

export async function initializeEnv() {
    if (isInitialized) return

    // 1. If USE_GSM is true, fetch from Google Secret Manager
    if (process.env.USE_GSM === 'true') {
        const client = new SecretManagerServiceClient()
        const projectPath =
            process.env.GSM_PROJECT_PATH ||
            'projects/project-c3f44f86-9bcc-45c8-baf/secrets/ipeko-mahjong/versions/latest'

        try {
            const [version] = await client.accessSecretVersion({
                name: projectPath,
            })
            const payload = version.payload?.data?.toString()
            if (payload) {
                const secrets = JSON.parse(payload) as Record<string, string>
                // Merge GSM secrets into process.env so getEnv/getEnvNumber can use them
                Object.assign(process.env, secrets)
            }
        } catch (error) {
            console.error(
                'Failed to load secrets from Google Secret Manager:',
                error instanceof Error ? error.message : String(error),
            )
            if (process.env.NODE_ENV === 'production') throw error
        }
    }

    // 2. Populate the ENV object
    Object.assign(ENV, {
        PORT: getEnvNumber('PORT', false, 3000),
        NODE_ENV: getEnv('NODE_ENV', false, 'development'),
        JWT_SECRET_KEY: getEnv('JWT_SECRET_KEY', true),
        DB_ENV: getEnv('DB_ENV', false, 'localhost'),
        DATABASE_NAME: getEnv('DATABASE_NAME', true),
        DATABASE_PORT: getEnvNumber('DATABASE_PORT', false, 3306),
        LOCAL_DATABASE_HOST: getEnv('LOCAL_DATABASE_HOST', false),
        LOCAL_DATABASE_USER: getEnv('LOCAL_DATABASE_USER', false),
        LOCAL_DATABASE_PASSWORD: getEnv('LOCAL_DATABASE_PASSWORD', false),
        GOOGLE_DATABASE_HOST: getEnv('GOOGLE_DATABASE_HOST', false),
        GOOGLE_DATABASE_USER: getEnv('GOOGLE_DATABASE_USER', false),
        GOOGLE_DATABASE_PASSWORD: getEnv('GOOGLE_DATABASE_PASSWORD', false),
        GOOGLE_CLOUD_STORAGE_BUCKET: getEnv(
            'GOOGLE_CLOUD_STORAGE_BUCKET',
            false,
            'ipeko-mahjong',
        ),
    })

    isInitialized = true
}
