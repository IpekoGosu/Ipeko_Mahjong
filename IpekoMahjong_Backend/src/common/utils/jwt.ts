import { UserDto } from '@src/modules/user/dto/user.dto'
import * as jwt from 'jsonwebtoken'
import { ENV } from '@src/common/utils/env'

// Access Token 생성
export function createAccessToken(payload: UserDto) {
    return jwt.sign(payload, ENV.JWT_SECRET_KEY, {
        expiresIn: '120m', // Access Token의 유효기간을 설정
    })
}

// Refresh Token 생성
export function createRefreshToken(payload: UserDto) {
    return jwt.sign(payload, ENV.JWT_SECRET_KEY, {
        expiresIn: '14d', // Refresh Token의 유효기간을 설정
    })
}

// JWT 토큰 검증
export function verifyToken(token: string) {
    try {
        return jwt.verify(token, ENV.JWT_SECRET_KEY)
    } catch {
        return null
    }
}
