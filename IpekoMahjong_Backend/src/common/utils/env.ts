import * as dotenv from 'dotenv'
import * as path from 'path'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { CommonError } from '../error/common.error'
import { ERROR_STATUS } from '../error/error.status'
import { Logger } from '@nestjs/common'

// Load .env file initially for local development
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function getEnv(key: string, required = true): string | undefined {
    const value = process.env[key]
    if (!value) {
        if (required) throw new CommonError(ERROR_STATUS.ENV_MISSING_ERROR)
        return undefined
    }
    return value
}

/**
 * Initial ENV object with all values as strings.
 * Note: These values might be overwritten by initializeEnv() if USE_GSM is true.
 */
export const ENV = {
    PORT: '3000',
    NODE_ENV: 'development',
    JWT_SECRET_KEY: '',
    DB_ENV: 'localhost',
    DATABASE_NAME: '',
    DATABASE_PORT: '3306',
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
        const projectPath = getEnv('GSM_PROJECT_PATH')

        try {
            const [version] = await client.accessSecretVersion({
                name: projectPath,
            })
            const payload = version.payload?.data?.toString()
            if (payload) {
                const secrets = JSON.parse(payload) as Record<string, string>
                Object.assign(process.env, secrets)
            }
        } catch (error) {
            new Logger('ENV').error(
                'Failed to load secrets from Google Secret Manager:',
                error instanceof Error ? error.stack : String(error),
            )
            if (process.env.NODE_ENV === 'production') throw error
        }
    }

    // 2. Populate the ENV object
    const requiredKeys: string[] = ['JWT_SECRET_KEY', 'DATABASE_NAME']

    for (const key of Object.keys(ENV)) {
        const k = key as keyof typeof ENV
        const isRequired = requiredKeys.includes(k)
        const value = getEnv(k, isRequired)

        if (value !== undefined) {
            ENV[k] = value
        }
    }

    // prevent ENV value modifications
    Object.freeze(ENV)
    isInitialized = true
}
