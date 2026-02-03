import { UserDto } from '@src/modules/user/dto/user.dto'
import * as jwt from 'jsonwebtoken'

// Access Token 생성
export function createAccessToken(payload: UserDto) {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: '120m', // Access Token의 유효기간을 설정
    })
}

// Refresh Token 생성
export function createRefreshToken(payload: UserDto) {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: '14d', // Refresh Token의 유효기간을 설정
    })
}

// JWT 토큰 검증
export function verifyToken(token: string) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET as string)
    } catch (error) {
        console.error(error)
        return null
    }
}
