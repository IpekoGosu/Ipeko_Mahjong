export interface RequestWithAuth {
    cookies?: Record<string, string>
    headers?: {
        cookie?: string
        authorization?: string
    }
    handshake?: {
        auth?: {
            token?: string
        }
        headers?: {
            cookie?: string
            authorization?: string
        }
    }
    auth?: {
        token?: string
    }
}

/**
 * Extracts JWT token from various sources:
 * 1. Explicitly provided 'auth.token' or 'handshake.auth.token' (Common in Socket.io)
 * 2. 'cookies.access_token'
 * 3. 'headers.cookie' (access_token=...)
 * 4. 'headers.authorization' (Bearer ...)
 */
export function extractJwt(req: RequestWithAuth): string | null {
    // 1. Check direct token fields (Common in Socket.io handshake.auth)
    let token = req.auth?.token || req.handshake?.auth?.token

    // 2. Check cookies object (If cookie-parser is used)
    if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token
    }

    // 3. Check raw cookie header
    if (!token) {
        const cookieHeader = req.headers?.cookie || req.handshake?.headers?.cookie
        if (cookieHeader) {
            const match = cookieHeader.match(/access_token=([^;]+)/)
            if (match) {
                token = match[1]
            }
        }
    }

    // 4. Check Authorization header
    if (!token) {
        const authHeader =
            req.headers?.authorization || req.handshake?.headers?.authorization
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }
    }

    return token || null
}
