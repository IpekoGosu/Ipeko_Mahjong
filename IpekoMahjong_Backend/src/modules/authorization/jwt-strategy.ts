// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { ENV } from '@src/common/utils/dotenv'
import { extractJwt, RequestWithAuth } from '@src/common/utils/auth.utils'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: unknown) => extractJwt(req as RequestWithAuth),
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            secretOrKey: ENV.JWT_SECRET_KEY,
            ignoreExpiration: false,
        })
    }

    validate(payload: { sub: number; email: string }) {
        return { userId: payload.sub, email: payload.email }
    }
}
