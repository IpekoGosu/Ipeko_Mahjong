// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'

interface RequestWithAuth {
    cookies?: Record<string, string>
    handshake?: {
        auth?: {
            token?: string
        }
    }
    auth?: {
        token?: string
    }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: unknown) => {
                    const request = req as RequestWithAuth & {
                        headers?: { cookie?: string }
                    }
                    let token =
                        request?.cookies?.access_token ||
                        request?.handshake?.auth?.token ||
                        request?.auth?.token

                    if (!token && request?.headers?.cookie) {
                        const match =
                            request.headers.cookie.match(/access_token=([^;]+)/)
                        if (match) {
                            token = match[1]
                        }
                    }

                    return token || null
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            secretOrKey: process.env.JWT_SECRET_KEY as string,
            ignoreExpiration: false,
        })
    }

    validate(payload: { sub: number; email: string }) {
        return { userId: payload.sub, email: payload.email }
    }
}
