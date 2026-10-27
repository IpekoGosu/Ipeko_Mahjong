import { ClsStore } from 'nestjs-cls'

export interface AuthenticatedUser {
    userId: number
    email: string
}

export interface AppClsStore extends ClsStore {
    user: AuthenticatedUser
}

/**
 * Type guard to safely check if an object is an AuthenticatedUser
 */
export function isAuthenticatedUser(obj: unknown): obj is AuthenticatedUser {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'userId' in obj &&
        typeof (obj as Record<string, unknown>).userId === 'number' &&
        'email' in obj &&
        typeof (obj as Record<string, unknown>).email === 'string'
    )
}
